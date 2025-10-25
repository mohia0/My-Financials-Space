/**
 * Sync Integration Layer
 * Connects the Supabase sync system to the main application
 */

// Global sync manager instance
let syncManager = null;
let isInitialized = false;

/**
 * Initialize the sync system
 */
async function initializeSync() {
  if (isInitialized) {
    console.log('⚠️ Sync system already initialized');
    return;
  }

  try {
    // Check if we have the required dependencies
    if (!window.supabaseClient || !window.currentUser) {
      console.log('⚠️ Supabase client or user not available');
      return;
    }

    console.log('🚀 Initializing sync system...');
    
    // Create sync manager
    syncManager = new SupabaseSync(window.supabaseClient, window.currentUser.id);
    
    // Initialize the sync system
    await syncManager.initialize();
    
    isInitialized = true;
    
    // Set up event listeners for realtime updates
    setupRealtimeListeners();
    
    console.log('✅ Sync system initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize sync system:', error);
    throw error;
  }
}

/**
 * Set up realtime event listeners
 */
function setupRealtimeListeners() {
  window.addEventListener('supabase_realtime_update', (event) => {
    const { table, event: eventType, data, oldData } = event.detail;
    
    console.log(`🔄 Realtime update received for ${table}:`, eventType);
    
    // Handle different table updates
    switch (table) {
      case 'personal_expenses':
        handlePersonalExpenseUpdate(eventType, data, oldData);
        break;
      case 'business_expenses':
        handleBusinessExpenseUpdate(eventType, data, oldData);
        break;
      case 'income':
        handleIncomeUpdate(eventType, data, oldData);
        break;
      case 'user_settings':
        handleUserSettingsUpdate(eventType, data, oldData);
        break;
    }
  });
}

/**
 * Handle personal expense updates
 */
function handlePersonalExpenseUpdate(eventType, data, oldData) {
  if (eventType === 'INSERT') {
    // Add new expense to local state
    const expense = mapSupabaseToLocalExpense(data);
    if (typeof state !== 'undefined' && state.personal) {
      state.personal.push(expense);
    }
  } else if (eventType === 'UPDATE') {
    // Update existing expense in local state
    const expense = mapSupabaseToLocalExpense(data);
    if (typeof state !== 'undefined' && state.personal) {
      const index = state.personal.findIndex(e => e.id === expense.id);
      if (index !== -1) {
        state.personal[index] = expense;
      }
    }
  } else if (eventType === 'DELETE') {
    // Remove expense from local state
    if (typeof state !== 'undefined' && state.personal) {
      state.personal = state.personal.filter(e => e.id !== oldData.id);
    }
  }
  
  // Update KPIs and tables smoothly without full re-render
  if (typeof renderKPIs === 'function') {
    renderKPIs();
  }
  if (typeof renderTables === 'function') {
    renderTables();
  }
}

/**
 * Handle business expense updates
 */
function handleBusinessExpenseUpdate(eventType, data, oldData) {
  if (eventType === 'INSERT') {
    const expense = mapSupabaseToLocalExpense(data);
    if (typeof state !== 'undefined' && state.biz) {
      state.biz.push(expense);
    }
  } else if (eventType === 'UPDATE') {
    const expense = mapSupabaseToLocalExpense(data);
    if (typeof state !== 'undefined' && state.biz) {
      const index = state.biz.findIndex(e => e.id === expense.id);
      if (index !== -1) {
        state.biz[index] = expense;
      }
    }
  } else if (eventType === 'DELETE') {
    if (typeof state !== 'undefined' && state.biz) {
      state.biz = state.biz.filter(e => e.id !== oldData.id);
    }
  }
  
  if (typeof renderKPIs === 'function') {
    renderKPIs();
  }
  if (typeof renderTables === 'function') {
    renderTables();
  }
}

/**
 * Handle income updates
 */
function handleIncomeUpdate(eventType, data, oldData) {
  if (eventType === 'INSERT') {
    const income = mapSupabaseToLocalIncome(data);
    if (typeof state !== 'undefined' && state.income) {
      const year = data.year.toString();
      if (!state.income[year]) {
        state.income[year] = [];
      }
      state.income[year].push(income);
    }
  } else if (eventType === 'UPDATE') {
    const income = mapSupabaseToLocalIncome(data);
    if (typeof state !== 'undefined' && state.income) {
      const year = data.year.toString();
      if (state.income[year]) {
        const index = state.income[year].findIndex(i => i.id === income.id);
        if (index !== -1) {
          state.income[year][index] = income;
        }
      }
    }
  } else if (eventType === 'DELETE') {
    if (typeof state !== 'undefined' && state.income) {
      const year = oldData.year.toString();
      if (state.income[year]) {
        state.income[year] = state.income[year].filter(i => i.id !== oldData.id);
      }
    }
  }
  
  if (typeof renderKPIs === 'function') {
    renderKPIs();
  }
  if (typeof renderTables === 'function') {
    renderTables();
  }
}

/**
 * Handle user settings updates
 */
function handleUserSettingsUpdate(eventType, data, oldData) {
  if (eventType === 'UPDATE' && typeof state !== 'undefined') {
    // Update local state with new settings
    if (data.fx_rate !== undefined) state.fx = data.fx_rate;
    if (data.theme !== undefined) state.theme = data.theme;
    if (data.autosave !== undefined) state.autosave = data.autosave ? 'on' : 'off';
    if (data.include_annual_in_monthly !== undefined) state.includeAnnualInMonthly = data.include_annual_in_monthly;
    if (data.inputs_locked !== undefined) state.inputsLocked = data.inputs_locked;
    if (data.preferred_currency !== undefined) {
      state.selectedCurrency = data.preferred_currency;
      if (typeof updateCurrency === 'function') {
        updateCurrency(data.preferred_currency);
      }
    }
  }
}

/**
 * Map Supabase expense data to local format
 */
function mapSupabaseToLocalExpense(supabaseData) {
  return {
    id: supabaseData.id,
    name: supabaseData.name,
    cost: supabaseData.cost,
    status: supabaseData.status,
    billing: supabaseData.billing,
    next: supabaseData.next_payment || '',
    monthlyUSD: supabaseData.monthly_usd || 0,
    yearlyUSD: supabaseData.yearly_usd || 0,
    monthlyEGP: supabaseData.monthly_egp || 0,
    yearlyEGP: supabaseData.yearly_egp || 0,
    icon: supabaseData.icon,
    order: supabaseData.order || 0
  };
}

/**
 * Map Supabase income data to local format
 */
function mapSupabaseToLocalIncome(supabaseData) {
  console.log('📥 Loading income from Supabase:', {
    id: supabaseData.id,
    name: supabaseData.name,
    progress: supabaseData.progress,
    note: supabaseData.note
  });
  
  return {
    id: supabaseData.id,
    name: supabaseData.name,
    tags: supabaseData.tags,
    date: supabaseData.date,
    allPayment: supabaseData.all_payment,
    paidUsd: supabaseData.paid_usd,
    paidEgp: supabaseData.paid_egp,
    method: supabaseData.method,
    icon: supabaseData.icon,
    order: supabaseData.order || 0,
    progress: supabaseData.progress || 10,
    note: supabaseData.note || ''
  };
}

/**
 * Save all data to Supabase
 */
async function saveToSupabase() {
  if (!syncManager || !isInitialized) {
    console.log('⚠️ Sync system not initialized, attempting to initialize...');
    try {
      await initializeSync();
    } catch (error) {
      console.error('❌ Failed to initialize sync system for saving:', error);
      return;
    }
  }

  try {
    console.log('💾 Saving all data to Supabase...');
    
    // Save user settings
    if (typeof state !== 'undefined') {
      const settings = {
        fx_rate: state.fx,
        theme: state.theme,
        autosave: state.autosave === 'on',
        include_annual_in_monthly: state.includeAnnualInMonthly,
        column_order: typeof columnOrder !== 'undefined' ? columnOrder : ['monthly', 'yearly', 'monthly-egp', 'yearly-egp'],
        available_years: typeof state.income !== 'undefined' ? Object.keys(state.income).map(year => parseInt(year)).sort((a, b) => a - b) : [],
        inputs_locked: state.inputsLocked,
        preferred_currency: state.selectedCurrency || 'EGP'
      };
      
      await syncManager.saveUserSettings(settings);
    }
    
    // Save personal expenses
    if (typeof state !== 'undefined' && state.personal) {
      await syncManager.savePersonalExpenses(state.personal);
    }
    
    // Save business expenses
    if (typeof state !== 'undefined' && state.biz) {
      await syncManager.saveBusinessExpenses(state.biz);
    }
    
    // Save income data
    if (typeof state !== 'undefined' && state.income) {
      await syncManager.saveIncomeData(state.income);
    }
    
    console.log('✅ All data saved to Supabase successfully');
    
  } catch (error) {
    console.error('❌ Failed to save data to Supabase:', error);
    throw error;
  }
}

/**
 * Load all data from Supabase
 */
async function loadFromSupabase() {
  if (!syncManager || !isInitialized) {
    console.log('⚠️ Sync system not initialized, attempting to initialize...');
    try {
      await initializeSync();
    } catch (error) {
      console.error('❌ Failed to initialize sync system for loading:', error);
      return;
    }
  }

  try {
    console.log('📥 Loading data from Supabase...');
    
    const data = await syncManager.loadUserData();
    
    // Update local state with loaded data using smooth update
    if (typeof state !== 'undefined') {
      // Use smooth update function if available, otherwise fallback to direct update
      if (typeof smoothUpdateData === 'function') {
        smoothUpdateData(data);
      } else {
        // Fallback to direct update
        // Update settings
        if (data.settings) {
          state.fx = data.settings.fx_rate || 48.1843;
          state.theme = data.settings.theme || 'dark';
          state.autosave = data.settings.autosave ? 'on' : 'off';
          state.includeAnnualInMonthly = data.settings.include_annual_in_monthly || false;
          state.inputsLocked = data.settings.inputs_locked || false;
          console.log('🔒 Lock state loaded from Supabase:', state.inputsLocked);
          state.selectedCurrency = data.settings.preferred_currency || 'EGP';
          
          if (typeof columnOrder !== 'undefined') {
            columnOrder = data.settings.column_order || ['monthly', 'yearly', 'monthly-egp', 'yearly-egp'];
          }
        }
        
        // Update personal expenses
        if (data.personal) {
          state.personal = data.personal.map(mapSupabaseToLocalExpense);
        }
        
        // Update business expenses
        if (data.business) {
          state.biz = data.business.map(mapSupabaseToLocalExpense);
        }
        
        // Update income data
        if (data.income) {
          const incomeByYear = {};
          data.income.forEach(income => {
            const year = income.year.toString();
            if (!incomeByYear[year]) {
              incomeByYear[year] = [];
            }
            incomeByYear[year].push(mapSupabaseToLocalIncome(income));
          });
          state.income = incomeByYear;
        }
      }
    }
    
    // Update the UI smoothly without full re-render
    if (typeof renderKPIs === 'function') {
      renderKPIs();
    }
    if (typeof renderTables === 'function') {
      renderTables();
    }
    if (typeof updateAnalyticsPage === 'function') {
      updateAnalyticsPage();
    }
    
        // Update year tabs if income data was loaded
        if (data.income && typeof createYearTabsFromData === 'function') {
          console.log('🔄 Updating year tabs from loaded income data...');
          createYearTabsFromData(state.income);
        }
        
        // Update UI elements after loading data from Supabase
        if (typeof updateInputsLockState === 'function') {
          console.log('🔄 Updating inputs lock state from loaded data');
          updateInputsLockState();
        }
        
        if (typeof updateLockIcon === 'function') {
          console.log('🔄 Updating lock icon from loaded data');
          updateLockIcon();
        }
        
        console.log('✅ Data loaded from Supabase successfully');
    
  } catch (error) {
    console.error('❌ Failed to load data from Supabase:', error);
    throw error;
  }
}

/**
 * Delete an expense
 */
async function deleteExpense(tableName, expenseId) {
  if (!syncManager || !isInitialized) {
    console.log('⚠️ Sync system not initialized');
    return;
  }

  try {
    await syncManager.deleteExpense(tableName, expenseId);
    console.log(`✅ Expense deleted from ${tableName}`);
  } catch (error) {
    console.error(`❌ Failed to delete expense from ${tableName}:`, error);
    throw error;
  }
}

/**
 * Delete an income entry
 */
async function deleteIncomeEntry(incomeId) {
  if (!syncManager || !isInitialized) {
    console.log('⚠️ Sync system not initialized');
    return;
  }

  try {
    await syncManager.deleteIncomeEntry(incomeId);
    console.log('✅ Income entry deleted');
  } catch (error) {
    console.error('❌ Failed to delete income entry:', error);
    throw error;
  }
}

/**
 * Cleanup sync system
 */
async function cleanupSync() {
  if (syncManager) {
    await syncManager.cleanup();
    syncManager = null;
    isInitialized = false;
    console.log('✅ Sync system cleaned up');
  }
}

// Make functions globally available
window.initializeSync = initializeSync;
window.saveToSupabase = saveToSupabase;
window.loadFromSupabase = loadFromSupabase;
window.deleteExpense = deleteExpense;
window.deleteIncomeEntry = deleteIncomeEntry;
window.cleanupSync = cleanupSync;

// Expose initialization status
Object.defineProperty(window, 'isInitialized', {
  get: () => isInitialized,
  enumerable: true,
  configurable: true
});

console.log('🔧 Sync integration functions loaded');
