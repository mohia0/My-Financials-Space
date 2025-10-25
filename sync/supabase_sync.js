/**
 * Supabase Sync System
 * A clean, reliable sync system using official Supabase JavaScript APIs
 * Based on: https://supabase.com/docs/reference/javascript/introduction
 */

class SupabaseSync {
  constructor(supabaseClient, userId) {
    this.client = supabaseClient;
    this.userId = userId;
    this.isConnected = false;
    this.realtimeChannels = new Map();
    this.pendingOperations = new Set();
    
    console.log('🔄 SupabaseSync initialized for user:', userId);
  }

  /**
   * Initialize the sync system
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Supabase sync system...');
      
      // Test connection
      await this.testConnection();
      
      // Set up realtime subscriptions
      await this.setupRealtimeSubscriptions();
      
      this.isConnected = true;
      console.log('✅ Supabase sync system initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Supabase sync:', error);
      throw error;
    }
  }

  /**
   * Test connection to Supabase
   */
  async testConnection() {
    try {
      const { data, error } = await this.client
        .from('user_settings')
        .select('id')
        .eq('user_id', this.userId)
        .limit(1);
        
      if (error) {
        throw new Error(`Connection test failed: ${error.message}`);
      }
      
      console.log('✅ Supabase connection verified');
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      throw error;
    }
  }

  /**
   * Set up realtime subscriptions for all tables
   */
  async setupRealtimeSubscriptions() {
    const tables = [
      { name: 'personal_expenses', event: 'personal_expenses_changed' },
      { name: 'business_expenses', event: 'business_expenses_changed' },
      { name: 'income', event: 'income_changed' },
      { name: 'user_settings', event: 'user_settings_changed' }
    ];

    for (const table of tables) {
      try {
        const channel = this.client
          .channel(`${table.name}_${this.userId}`)
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: table.name,
              filter: `user_id=eq.${this.userId}`
            }, 
            (payload) => this.handleRealtimeUpdate(table.name, payload)
          )
          .subscribe();

        this.realtimeChannels.set(table.name, channel);
        console.log(`✅ Realtime subscription for ${table.name} established`);
        
      } catch (error) {
        console.error(`❌ Failed to setup realtime for ${table.name}:`, error);
      }
    }
  }

  /**
   * Handle realtime updates from Supabase
   */
  handleRealtimeUpdate(tableName, payload) {
    console.log(`🔄 Realtime update for ${tableName}:`, payload);
    
    // Emit custom event for the main app to handle
    window.dispatchEvent(new CustomEvent('supabase_realtime_update', {
      detail: {
        table: tableName,
        event: payload.eventType,
        data: payload.new || payload.old,
        oldData: payload.old
      }
    }));
  }

  /**
   * Save user settings to Supabase
   */
  async saveUserSettings(settings) {
    try {
      const { data, error } = await this.client
        .from('user_settings')
        .upsert({
          user_id: this.userId,
          fx_rate: settings.fx_rate,
          theme: settings.theme,
          autosave: settings.autosave,
          include_annual_in_monthly: settings.include_annual_in_monthly,
          column_order: settings.column_order,
          available_years: settings.available_years,
          inputs_locked: settings.inputs_locked,
          preferred_currency: settings.preferred_currency,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      console.log('✅ User settings saved to Supabase');
      return data;
      
    } catch (error) {
      console.error('❌ Failed to save user settings:', error);
      throw error;
    }
  }

  /**
   * Save personal expenses to Supabase
   */
  async savePersonalExpenses(expenses) {
    try {
      const operations = [];
      
      for (const expense of expenses) {
        if (expense.id) {
          // Update existing expense
          operations.push(
            this.client
              .from('personal_expenses')
              .update({
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
              })
              .eq('id', expense.id)
          );
        } else {
          // Create new expense
          operations.push(
            this.client
              .from('personal_expenses')
              .insert({
                user_id: this.userId,
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0
              })
              .select()
              .single()
          );
        }
      }
      
      const results = await Promise.allSettled(operations);
      
      // Update local IDs for new expenses
      let newExpenseIndex = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value.data && !expenses[i].id) {
          expenses[i].id = result.value.data.id;
          newExpenseIndex++;
        }
      }
      
      console.log(`✅ Personal expenses saved to Supabase (${expenses.length} items)`);
      return results;
      
    } catch (error) {
      console.error('❌ Failed to save personal expenses:', error);
      throw error;
    }
  }

  /**
   * Save business expenses to Supabase
   */
  async saveBusinessExpenses(expenses) {
    try {
      const operations = [];
      
      for (const expense of expenses) {
        if (expense.id) {
          // Update existing expense
          operations.push(
            this.client
              .from('business_expenses')
              .update({
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                next_payment: expense.next ? new Date(expense.next).toISOString().split('T')[0] : null,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0,
                updated_at: new Date().toISOString()
              })
              .eq('id', expense.id)
          );
        } else {
          // Create new expense
          operations.push(
            this.client
              .from('business_expenses')
              .insert({
                user_id: this.userId,
                name: expense.name,
                cost: expense.cost,
                status: expense.status,
                billing: expense.billing,
                next_payment: expense.next ? new Date(expense.next).toISOString().split('T')[0] : null,
                monthly_usd: expense.monthlyUSD || 0,
                yearly_usd: expense.yearlyUSD || 0,
                monthly_egp: expense.monthlyEGP || 0,
                yearly_egp: expense.yearlyEGP || 0,
                icon: expense.icon,
                order: expense.order || 0
              })
              .select()
              .single()
          );
        }
      }
      
      const results = await Promise.allSettled(operations);
      
      // Update local IDs for new expenses
      let newExpenseIndex = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value.data && !expenses[i].id) {
          expenses[i].id = result.value.data.id;
          newExpenseIndex++;
        }
      }
      
      console.log(`✅ Business expenses saved to Supabase (${expenses.length} items)`);
      return results;
      
    } catch (error) {
      console.error('❌ Failed to save business expenses:', error);
      throw error;
    }
  }

  /**
   * Save income data to Supabase
   */
  async saveIncomeData(incomeData) {
    try {
      const operations = [];
      
      for (const [year, yearData] of Object.entries(incomeData)) {
        for (const income of yearData) {
          if (income.id) {
            // Update existing income
            operations.push(
              this.client
                .from('income')
                .update({
                  name: income.name || '',
                  tags: income.tags || '',
                  date: income.date || new Date().toISOString().split('T')[0],
                  all_payment: income.allPayment || 0,
                  paid_usd: income.paidUsd || 0,
                  paid_egp: income.paidEgp || 0,
                  method: income.method || 'Bank Transfer',
                  icon: income.icon || 'fa:dollar-sign',
                  year: parseInt(year),
                  order: income.order || 0,
                  progress: income.progress || 10,
                  note: income.note || '',
                  updated_at: new Date().toISOString()
                })
                .eq('id', income.id)
            );
          } else {
            // Create new income
            operations.push(
              this.client
                .from('income')
                .insert({
                  user_id: this.userId,
                  name: income.name || '',
                  tags: income.tags || '',
                  date: income.date || new Date().toISOString().split('T')[0],
                  all_payment: income.allPayment || 0,
                  paid_usd: income.paidUsd || 0,
                  paid_egp: income.paidEgp || 0,
                  method: income.method || 'Bank Transfer',
                  icon: income.icon || 'fa:dollar-sign',
                  year: parseInt(year),
                  order: income.order || 0,
                  progress: income.progress || 10,
                  note: income.note || ''
                })
                .select()
                .single()
            );
          }
        }
      }
      
      const results = await Promise.allSettled(operations);
      
      // Update local IDs for new income entries
      let newIncomeIndex = 0;
      for (const [year, yearData] of Object.entries(incomeData)) {
        for (const income of yearData) {
          if (!income.id && newIncomeIndex < results.length) {
            const result = results[newIncomeIndex];
            if (result.status === 'fulfilled' && result.value.data) {
              income.id = result.value.data.id;
            }
            newIncomeIndex++;
          }
        }
      }
      
      console.log(`✅ Income data saved to Supabase (${Object.values(incomeData).flat().length} items)`);
      return results;
      
    } catch (error) {
      console.error('❌ Failed to save income data:', error);
      throw error;
    }
  }

  /**
   * Load all user data from Supabase
   */
  async loadUserData() {
    try {
      console.log('📥 Loading user data from Supabase...');
      
      // Load all data in parallel
      const [settingsResult, personalResult, businessResult, incomeResult] = await Promise.allSettled([
        this.client
          .from('user_settings')
          .select('*')
          .eq('user_id', this.userId)
          .single(),
          
        this.client
          .from('personal_expenses')
          .select('*')
          .eq('user_id', this.userId)
          .order('order', { ascending: true })
          .order('created_at', { ascending: true }),
          
        this.client
          .from('business_expenses')
          .select('*')
          .eq('user_id', this.userId)
          .order('order', { ascending: true })
          .order('created_at', { ascending: true }),
          
        this.client
          .from('income')
          .select('*')
          .eq('user_id', this.userId)
          .order('year', { ascending: true })
          .order('order', { ascending: true })
          .order('created_at', { ascending: true })
      ]);
      
      const data = {
        settings: settingsResult.status === 'fulfilled' ? settingsResult.value.data : null,
        personal: personalResult.status === 'fulfilled' ? personalResult.value.data : [],
        business: businessResult.status === 'fulfilled' ? businessResult.value.data : [],
        income: incomeResult.status === 'fulfilled' ? incomeResult.value.data : []
      };
      
      console.log('✅ User data loaded from Supabase');
      return data;
      
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
      throw error;
    }
  }

  /**
   * Delete an expense from Supabase
   */
  async deleteExpense(tableName, expenseId) {
    try {
      const { error } = await this.client
        .from(tableName)
        .delete()
        .eq('id', expenseId)
        .eq('user_id', this.userId);

      if (error) throw error;
      
      console.log(`✅ Expense deleted from ${tableName}`);
      
    } catch (error) {
      console.error(`❌ Failed to delete expense from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete an income entry from Supabase
   */
  async deleteIncomeEntry(incomeId) {
    try {
      const { error } = await this.client
        .from('income')
        .delete()
        .eq('id', incomeId)
        .eq('user_id', this.userId);

      if (error) throw error;
      
      console.log('✅ Income entry deleted');
      
    } catch (error) {
      console.error('❌ Failed to delete income entry:', error);
      throw error;
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up Supabase sync...');
      
      // Unsubscribe from all realtime channels
      for (const [tableName, channel] of this.realtimeChannels) {
        await this.client.removeChannel(channel);
        console.log(`✅ Unsubscribed from ${tableName} realtime channel`);
      }
      
      this.realtimeChannels.clear();
      this.isConnected = false;
      
      console.log('✅ Supabase sync cleanup completed');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseSync;
} else {
  window.SupabaseSync = SupabaseSync;
}
