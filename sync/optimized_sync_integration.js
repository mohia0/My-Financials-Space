// 🚀 OPTIMIZED SYNC INTEGRATION FOR YOUR FINANCIAL TOOL
// This replaces the current slow sync system with a fast, smart, and live system

// ========================================
// 0. DUPLICATION PREVENTION GUARDS
// ========================================

// Prevent multiple loading of this script
if (window.optimizedSyncIntegrationLoaded) {
  console.warn('⚠️ Optimized sync integration already loaded, preventing duplicate initialization');
  throw new Error('Optimized sync integration already loaded');
}
window.optimizedSyncIntegrationLoaded = true;

// Track processed records to prevent duplicates
const processedRecords = new Set();
const syncInProgress = new Set();

// Wait for core sync classes to be loaded
function waitForSyncClasses() {
  return new Promise((resolve) => {
    const checkClasses = () => {
      if (window.SmartSyncManager && window.ChangeTracker && window.BatchProcessor) {
        resolve();
      } else {
        setTimeout(checkClasses, 100);
      }
    };
    checkClasses();
  });
}

// ========================================
// 1. GLOBAL SYNC MANAGER INSTANCE
// ========================================

let smartSyncManager = null;
let syncPerformanceMonitor = null;
let isInitialized = false;

// ========================================
// 2. INITIALIZE OPTIMIZED SYNC
// ========================================

async function initializeOptimizedSync() {
  if (!currentUser || !supabaseReady) return;
  
  // Prevent multiple initialization
  if (isInitialized) {
    console.warn('⚠️ Sync system already initialized, skipping duplicate initialization');
    return;
  }
  
  console.log('🚀 Initializing optimized sync system...');
  
  // Wait for sync classes to be loaded
  await waitForSyncClasses();
  
  // Initialize performance monitoring
  syncPerformanceMonitor = new window.SyncPerformanceMonitor();
  
  // Initialize smart sync manager
  smartSyncManager = new window.SmartSyncManager(window.supabaseClient, currentUser.id);
  await smartSyncManager.initialize();
  
  isInitialized = true;
  console.log('✅ Optimized sync system initialized');
}

// ========================================
// 3. REPLACE CURRENT SAVE FUNCTIONS
// ========================================

// Replace the current saveToSupabase function
async function saveToSupabaseOptimized() {
  if (!currentUser || !supabaseReady || !smartSyncManager) return;
  
  // Prevent concurrent sync operations
  const syncKey = 'settings_sync';
  if (syncInProgress.has(syncKey)) {
    console.log('🔄 Sync already in progress, skipping duplicate request');
    return;
  }
  
  syncInProgress.add(syncKey);
  const startTime = performance.now();
  
  try {
    // Track settings change
    const settingsData = {
      user_id: currentUser.id,
      fx_rate: state.fx,
      theme: state.theme,
      autosave: state.autosave === 'on',
      include_annual_in_monthly: state.includeAnnualInMonthly,
      column_order: columnOrder,
      available_years: Object.keys(state.income).map(year => parseInt(year)).sort((a, b) => a - b),
      inputs_locked: state.inputsLocked,
      updated_at: new Date().toISOString()
    };
    
    smartSyncManager.trackChange('settings', currentUser.id, settingsData);
    
    // Track personal expenses changes with deduplication
    state.personal.forEach(expense => {
      const recordKey = `personal_${expense.id}`;
      if (smartSyncManager.changeTracker.hasChanged('personal_expense', expense.id, expense) && 
          !processedRecords.has(recordKey)) {
        const expenseData = {
          id: expense.id,
          user_id: currentUser.id,
          name: expense.name,
          cost: expense.cost,
          status: expense.status,
          billing: expense.billing,
          monthly_usd: expense.monthlyUSD || 0,
          yearly_usd: expense.yearlyUSD || 0,
          monthly_egp: expense.monthlyEGP || 0,
          yearly_egp: expense.yearlyEGP || 0,
          icon: expense.icon,
          order: expense.order || 0,
          updated_at: new Date().toISOString()
        };
        
        smartSyncManager.trackChange('personal_expense', expense.id, expenseData);
        processedRecords.add(recordKey);
      }
    });
    
    // Track business expenses changes with deduplication
    state.biz.forEach(expense => {
      const recordKey = `business_${expense.id}`;
      if (smartSyncManager.changeTracker.hasChanged('business_expense', expense.id, expense) && 
          !processedRecords.has(recordKey)) {
        const expenseData = {
          id: expense.id,
          user_id: currentUser.id,
          name: expense.name,
          cost: expense.cost,
          status: expense.status,
          billing: expense.billing,
          next_payment: expense.nextPayment,
          monthly_usd: expense.monthlyUSD || 0,
          yearly_usd: expense.yearlyUSD || 0,
          monthly_egp: expense.monthlyEGP || 0,
          yearly_egp: expense.yearlyEGP || 0,
          icon: expense.icon,
          order: expense.order || 0,
          updated_at: new Date().toISOString()
        };
        
        smartSyncManager.trackChange('business_expense', expense.id, expenseData);
        processedRecords.add(recordKey);
      }
    });
    
    // Track income changes with deduplication
    Object.keys(state.income).forEach(year => {
      state.income[year].forEach(income => {
        const recordKey = `income_${income.id}`;
        if (smartSyncManager.changeTracker.hasChanged('income', income.id, income) && 
            !processedRecords.has(recordKey)) {
          const incomeData = {
            id: income.id,
            user_id: currentUser.id,
            name: income.name || '',
            tags: income.tags || '',
            date: income.date,
            all_payment: income.allPayment || 0,
            paid_usd: income.paidUSD || 0,
            paid_egp: income.paidEGP || 0,
            method: income.method || 'Bank Transfer',
            year: parseInt(year),
            icon: income.icon || 'fa:dollar-sign',
            order: income.order || 0,
            updated_at: new Date().toISOString()
          };
          
          smartSyncManager.trackChange('income', income.id, incomeData);
          processedRecords.add(recordKey);
        }
      });
    });
    
    // Force immediate sync
    await smartSyncManager.forceSync();
    
    const duration = performance.now() - startTime;
    syncPerformanceMonitor.recordSync(duration, true);
    
    console.log(`⚡ Optimized sync completed in ${duration.toFixed(2)}ms`);
    
  } catch (error) {
    const duration = performance.now() - startTime;
    syncPerformanceMonitor.recordSync(duration, false);
    
    console.error('Optimized sync failed:', error);
    throw error;
  } finally {
    // Always clean up the sync lock
    syncInProgress.delete(syncKey);
  }
}

// ========================================
// 4. REPLACE INSTANT SAVE FUNCTIONS
// ========================================

// Replace instantSaveAll with optimized version
async function instantSaveAllOptimized(source = 'general') {
  if (state.inputsLocked) {
    console.log('Lock is active - saving locally only, not to cloud');
    saveToLocal();
    return;
  }
  
  if (!currentUser || !supabaseReady || !smartSyncManager) {
    console.log('Cloud sync not available, saving locally');
    saveToLocal();
    return;
  }
  
  const startTime = performance.now();
  
  try {
    console.log('⚡ Instant optimized save:', source);
    updateSyncStatus('syncing');
    
    // Use smart sync instead of full sync
    await saveToSupabaseOptimized();
    
    updateSyncStatus('success');
    showNotification('Synced instantly', 'success', 1000);
    
    const duration = performance.now() - startTime;
    syncPerformanceMonitor.recordSync(duration, true);
    
  } catch (error) {
    const duration = performance.now() - startTime;
    syncPerformanceMonitor.recordSync(duration, false);
    
    console.error('Instant optimized save error:', error);
    updateSyncStatus('error');
    showNotification('Sync failed', 'error', 2000);
    
    // Fallback to local save
    saveToLocal();
  }
}

// ========================================
// 5. REAL-TIME UPDATE HANDLERS
// ========================================

// Handle real-time updates from other devices
function handleRealtimeUpdate(table, payload) {
  console.log(`📡 Real-time update from ${table}:`, payload);
  
  // Create a unique key for this update to prevent duplicates
  const updateKey = `${table}_${payload.new?.id || payload.old?.id}_${Date.now()}`;
  
  if (processedRecords.has(updateKey)) {
    console.log('🔄 Duplicate real-time update detected, skipping');
    return;
  }
  
  processedRecords.add(updateKey);
  
  // Clean up old processed records to prevent memory leaks
  if (processedRecords.size > 1000) {
    const oldRecords = Array.from(processedRecords).slice(0, 500);
    oldRecords.forEach(record => processedRecords.delete(record));
  }
  
  switch (table) {
    case 'personal_expenses':
      updatePersonalExpenseFromRealtime(payload);
      break;
    case 'business_expenses':
      updateBusinessExpenseFromRealtime(payload);
      break;
    case 'income':
      updateIncomeFromRealtime(payload);
      break;
    case 'user_settings':
      updateSettingsFromRealtime(payload);
      break;
  }
  
  // Re-render the UI
  renderAll();
}

// Update personal expense from real-time
function updatePersonalExpenseFromRealtime(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  switch (eventType) {
    case 'INSERT':
    case 'UPDATE':
      if (newRecord) {
        // Check if this record already exists to prevent duplicates
        const existingIndex = state.personal.findIndex(expense => expense.id === newRecord.id);
        if (existingIndex >= 0) {
          // Update existing record
          state.personal[existingIndex] = mapSupabaseToLocal(newRecord, 'personal');
        } else {
          // Only add if it doesn't already exist
          const mappedRecord = mapSupabaseToLocal(newRecord, 'personal');
          state.personal.push(mappedRecord);
        }
      }
      break;
    case 'DELETE':
      if (oldRecord) {
        state.personal = state.personal.filter(expense => expense.id !== oldRecord.id);
      }
      break;
  }
}

// Update business expense from real-time
function updateBusinessExpenseFromRealtime(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  switch (eventType) {
    case 'INSERT':
    case 'UPDATE':
      if (newRecord) {
        // Check if this record already exists to prevent duplicates
        const existingIndex = state.biz.findIndex(expense => expense.id === newRecord.id);
        if (existingIndex >= 0) {
          // Update existing record
          state.biz[existingIndex] = mapSupabaseToLocal(newRecord, 'business');
        } else {
          // Only add if it doesn't already exist
          const mappedRecord = mapSupabaseToLocal(newRecord, 'business');
          state.biz.push(mappedRecord);
        }
      }
      break;
    case 'DELETE':
      if (oldRecord) {
        state.biz = state.biz.filter(expense => expense.id !== oldRecord.id);
      }
      break;
  }
}

// Update income from real-time
function updateIncomeFromRealtime(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  
  switch (eventType) {
    case 'INSERT':
    case 'UPDATE':
      if (newRecord) {
        const year = newRecord.year.toString();
        if (!state.income[year]) {
          state.income[year] = [];
        }
        
        // Check if this record already exists to prevent duplicates
        const existingIndex = state.income[year].findIndex(income => income.id === newRecord.id);
        if (existingIndex >= 0) {
          // Update existing record
          state.income[year][existingIndex] = mapSupabaseToLocal(newRecord, 'income');
        } else {
          // Only add if it doesn't already exist
          const mappedRecord = mapSupabaseToLocal(newRecord, 'income');
          state.income[year].push(mappedRecord);
        }
      }
      break;
    case 'DELETE':
      if (oldRecord) {
        const year = oldRecord.year.toString();
        if (state.income[year]) {
          state.income[year] = state.income[year].filter(income => income.id !== oldRecord.id);
        }
      }
      break;
  }
}

// Update settings from real-time
function updateSettingsFromRealtime(payload) {
  const { eventType, new: newRecord } = payload;
  
  if (eventType === 'INSERT' || eventType === 'UPDATE') {
    if (newRecord) {
      state.fx = newRecord.fx_rate || 48.1843;
      state.theme = newRecord.theme || 'dark';
      state.autosave = newRecord.autosave ? 'on' : 'off';
      state.includeAnnualInMonthly = newRecord.include_annual_in_monthly !== undefined ? newRecord.include_annual_in_monthly : true;
      state.inputsLocked = newRecord.inputs_locked || false;
      
      if (newRecord.column_order) {
        columnOrder = newRecord.column_order;
      }
      
      if (newRecord.available_years) {
        // Update year tabs
        createYearTabsFromData(state.income);
      }
      
      // Update UI
      applyTheme();
      updateSettingsUI();
    }
  }
}

// ========================================
// 6. MAPPING FUNCTIONS
// ========================================

// Map Supabase data to local format
function mapSupabaseToLocal(supabaseData, type) {
  switch (type) {
    case 'personal':
      return {
        id: supabaseData.id,
        name: supabaseData.name,
        cost: supabaseData.cost,
        status: supabaseData.status,
        billing: supabaseData.billing,
        monthlyUSD: supabaseData.monthly_usd,
        yearlyUSD: supabaseData.yearly_usd,
        monthlyEGP: supabaseData.monthly_egp,
        yearlyEGP: supabaseData.yearly_egp,
        icon: supabaseData.icon,
        order: supabaseData.order || 0
      };
      
    case 'business':
      return {
        id: supabaseData.id,
        name: supabaseData.name,
        cost: supabaseData.cost,
        status: supabaseData.status,
        billing: supabaseData.billing,
        nextPayment: supabaseData.next_payment,
        monthlyUSD: supabaseData.monthly_usd,
        yearlyUSD: supabaseData.yearly_usd,
        monthlyEGP: supabaseData.monthly_egp,
        yearlyEGP: supabaseData.yearly_egp,
        icon: supabaseData.icon,
        order: supabaseData.order || 0
      };
      
    case 'income':
      return {
        id: supabaseData.id,
        name: supabaseData.name,
        tags: supabaseData.tags,
        date: supabaseData.date,
        allPayment: supabaseData.all_payment,
        paidUSD: supabaseData.paid_usd,
        paidEGP: supabaseData.paid_egp,
        method: supabaseData.method,
        icon: supabaseData.icon,
        order: supabaseData.order || 0
      };
      
    default:
      return supabaseData;
  }
}

// ========================================
// 7. INTEGRATION FUNCTIONS
// ========================================

// Replace the current save function
function saveOptimized(source = 'general') {
  // Check if lock is active - if so, only save locally, not to cloud
  if (state.inputsLocked && currentUser && supabaseReady) {
    console.log('Lock is active - saving locally only, not to cloud');
    saveToLocal();
    return;
  }
  
  // If user is signed in, use optimized instant save
  if (currentUser && supabaseReady && smartSyncManager) {
    instantSaveAllOptimized(source);
  } else {
    // Fallback to local save
    saveToLocal();
  }
}

// ========================================
// 8. PERFORMANCE MONITORING
// ========================================

// Get sync performance metrics
function getSyncMetrics() {
  if (!syncPerformanceMonitor) return null;
  return syncPerformanceMonitor.getMetrics();
}

// Show sync performance in console
function logSyncPerformance() {
  const metrics = getSyncMetrics();
  if (metrics) {
    console.log('📊 Sync Performance Metrics:', {
      'Total Syncs': metrics.syncCount,
      'Average Time': `${metrics.averageSyncTime.toFixed(2)}ms`,
      'Error Rate': `${((metrics.errorCount / metrics.syncCount) * 100).toFixed(1)}%`,
      'Last Sync': metrics.lastSyncTime
    });
  }
}

// ========================================
// 9. CLEANUP
// ========================================

// Cleanup sync system
function cleanupOptimizedSync() {
  if (smartSyncManager) {
    smartSyncManager.destroy();
    smartSyncManager = null;
  }
  
  syncPerformanceMonitor = null;
  isInitialized = false;
  
  // Clear processed records and sync locks
  processedRecords.clear();
  syncInProgress.clear();
  
  console.log('🧹 Optimized sync system cleaned up');
}

// ========================================
// 11. DUPLICATION PREVENTION UTILITIES
// ========================================

// Clear processed records (useful for testing or manual cleanup)
function clearProcessedRecords() {
  processedRecords.clear();
  console.log('🧹 Processed records cleared');
}

// Get sync status information
function getSyncStatus() {
  return {
    isInitialized,
    processedRecordsCount: processedRecords.size,
    syncInProgress: Array.from(syncInProgress),
    smartSyncManagerActive: !!smartSyncManager,
    syncPerformanceMonitorActive: !!syncPerformanceMonitor
  };
}

// Force cleanup of old processed records
function cleanupOldProcessedRecords() {
  if (processedRecords.size > 500) {
    const oldRecords = Array.from(processedRecords).slice(0, 250);
    oldRecords.forEach(record => processedRecords.delete(record));
    console.log(`🧹 Cleaned up ${oldRecords.length} old processed records`);
  }
}

// ========================================
// 12. DATA DEDUPLICATION UTILITIES
// ========================================

// Remove duplicates from personal expenses
function deduplicatePersonalExpenses() {
  const seen = new Set();
  const originalLength = state.personal.length;
  
  state.personal = state.personal.filter(expense => {
    const key = `${expense.name}_${expense.cost}_${expense.billing}`;
    if (seen.has(key)) {
      console.log(`🔄 Removing duplicate personal expense: ${expense.name}`);
      return false;
    }
    seen.add(key);
    return true;
  });
  
  const removed = originalLength - state.personal.length;
  if (removed > 0) {
    console.log(`✅ Removed ${removed} duplicate personal expenses`);
    renderAll();
  }
}

// Remove duplicates from business expenses
function deduplicateBusinessExpenses() {
  const seen = new Set();
  const originalLength = state.biz.length;
  
  state.biz = state.biz.filter(expense => {
    const key = `${expense.name}_${expense.cost}_${expense.billing}`;
    if (seen.has(key)) {
      console.log(`🔄 Removing duplicate business expense: ${expense.name}`);
      return false;
    }
    seen.add(key);
    return true;
  });
  
  const removed = originalLength - state.biz.length;
  if (removed > 0) {
    console.log(`✅ Removed ${removed} duplicate business expenses`);
    renderAll();
  }
}

// Remove duplicates from income
function deduplicateIncome() {
  let totalRemoved = 0;
  
  Object.keys(state.income).forEach(year => {
    const seen = new Set();
    const originalLength = state.income[year].length;
    
    state.income[year] = state.income[year].filter(income => {
      const key = `${income.name}_${income.date}_${income.allPayment}`;
      if (seen.has(key)) {
        console.log(`🔄 Removing duplicate income: ${income.name} (${year})`);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    totalRemoved += originalLength - state.income[year].length;
  });
  
  if (totalRemoved > 0) {
    console.log(`✅ Removed ${totalRemoved} duplicate income records`);
    renderAll();
  }
}

// Remove all duplicates from all data
function deduplicateAllData() {
  console.log('🧹 Starting comprehensive data deduplication...');
  
  deduplicatePersonalExpenses();
  deduplicateBusinessExpenses();
  deduplicateIncome();
  
  // Clear processed records to start fresh
  clearProcessedRecords();
  
  console.log('✅ Data deduplication completed');
}

// ========================================
// 10. USAGE INSTRUCTIONS
// ========================================

/*
TO INTEGRATE THIS INTO YOUR EXISTING CODE:

1. Replace the current saveToSupabase function with saveToSupabaseOptimized
2. Replace the current instantSaveAll function with instantSaveAllOptimized  
3. Replace the current save function with saveOptimized
4. Call initializeOptimizedSync() when user signs in
5. Call cleanupOptimizedSync() when user signs out

EXAMPLE INTEGRATION:

// In your authentication success handler:
if (session?.user) {
  currentUser = session.user;
  updateAuthUI();
  loadUserData();
  initializeOptimizedSync(); // Add this line
}

// In your sign out handler:
currentUser = null;
updateAuthUI();
cleanupOptimizedSync(); // Add this line

// Replace your existing save calls:
// OLD: save('general');
// NEW: saveOptimized('general');

// Replace your existing instant save calls:
// OLD: instantSaveAll('general');
// NEW: instantSaveAllOptimized('general');
*/

// Make all functions globally available
window.initializeOptimizedSync = initializeOptimizedSync;
window.cleanupOptimizedSync = cleanupOptimizedSync;
window.saveToSupabaseOptimized = saveToSupabaseOptimized;
window.instantSaveAllOptimized = instantSaveAllOptimized;
window.saveOptimized = saveOptimized;
window.getSyncMetrics = getSyncMetrics;
window.logSyncPerformance = logSyncPerformance;
window.clearProcessedRecords = clearProcessedRecords;
window.getSyncStatus = getSyncStatus;
window.cleanupOldProcessedRecords = cleanupOldProcessedRecords;
window.handleRealtimeUpdate = handleRealtimeUpdate;
window.deduplicatePersonalExpenses = deduplicatePersonalExpenses;
window.deduplicateBusinessExpenses = deduplicateBusinessExpenses;
window.deduplicateIncome = deduplicateIncome;
window.deduplicateAllData = deduplicateAllData;

console.log('✅ Sync integration functions loaded and made globally available');
