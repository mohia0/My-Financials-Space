// 🚀 OPTIMIZED SYNC SYSTEM FOR SUPABASE
// This file contains the improved sync mechanisms

// ========================================
// 1. CHANGE DETECTION & DIFFERENTIAL SYNC
// ========================================

class ChangeTracker {
  constructor() {
    this.changes = new Map();
    this.lastSync = new Map();
  }
  
  // Track what changed since last sync
  trackChange(type, id, data) {
    const key = `${type}_${id}`;
    this.changes.set(key, {
      type,
      id,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now()
    });
  }
  
  // Get only changed items
  getChanges() {
    return Array.from(this.changes.values());
  }
  
  // Clear changes after successful sync
  clearChanges() {
    this.changes.clear();
  }
  
  // Check if item changed since last sync
  hasChanged(type, id, currentData) {
    const key = `${type}_${id}`;
    const lastData = this.lastSync.get(key);
    if (!lastData) return true;
    
    return JSON.stringify(currentData) !== JSON.stringify(lastData);
  }
}

// ========================================
// 2. BATCH OPERATIONS
// ========================================

class BatchProcessor {
  constructor(supabaseClient) {
    this.client = supabaseClient;
    this.batchSize = 10; // Process 10 items at once
    this.batchDelay = 100; // 100ms delay between batches
  }
  
  // Batch insert/update operations
  async batchUpsert(table, items, conflictColumn = 'id') {
    const batches = this.chunkArray(items, this.batchSize);
    const results = [];
    
    for (const batch of batches) {
      try {
        const { data, error } = await this.client
          .from(table)
          .upsert(batch, { onConflict: conflictColumn });
        
        if (error) throw error;
        results.push(data);
        
        // Small delay between batches to avoid overwhelming the server
        if (batches.length > 1) {
          await this.delay(this.batchDelay);
        }
      } catch (error) {
        console.error(`Batch upsert error for ${table}:`, error);
        throw error;
      }
    }
    
    return results.flat();
  }
  
  // Batch delete operations
  async batchDelete(table, ids) {
    const batches = this.chunkArray(ids, this.batchSize);
    const results = [];
    
    for (const batch of batches) {
      try {
        const { error } = await this.client
          .from(table)
          .delete()
          .in('id', batch);
        
        if (error) throw error;
        results.push(true);
        
        if (batches.length > 1) {
          await this.delay(this.batchDelay);
        }
      } catch (error) {
        console.error(`Batch delete error for ${table}:`, error);
        throw error;
      }
    }
    
    return results;
  }
  
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========================================
// 3. REAL-TIME SYNC WITH SUPABASE REALTIME
// ========================================

class RealtimeSync {
  constructor(supabaseClient, userId) {
    this.client = supabaseClient;
    this.userId = userId;
    this.subscriptions = new Map();
    this.isEnabled = false;
  }
  
  // Enable real-time sync for all tables
  enableRealtimeSync(onChange) {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    
    // Subscribe to personal expenses changes
    this.subscribeToTable('personal_expenses', (payload) => {
      if (payload.new?.user_id === this.userId || payload.old?.user_id === this.userId) {
        onChange('personal_expenses', payload);
      }
    });
    
    // Subscribe to business expenses changes
    this.subscribeToTable('business_expenses', (payload) => {
      if (payload.new?.user_id === this.userId || payload.old?.user_id === this.userId) {
        onChange('business_expenses', payload);
      }
    });
    
    // Subscribe to income changes
    this.subscribeToTable('income', (payload) => {
      if (payload.new?.user_id === this.userId || payload.old?.user_id === this.userId) {
        onChange('income', payload);
      }
    });
    
    // Subscribe to user settings changes
    this.subscribeToTable('user_settings', (payload) => {
      if (payload.new?.user_id === this.userId || payload.old?.user_id === this.userId) {
        onChange('user_settings', payload);
      }
    });
  }
  
  subscribeToTable(table, callback) {
    const subscription = this.client
      .channel(`${table}_changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: table,
          filter: `user_id=eq.${this.userId}`
        }, 
        callback
      )
      .subscribe();
    
    this.subscriptions.set(table, subscription);
  }
  
  // Disable real-time sync
  disableRealtimeSync() {
    this.subscriptions.forEach(subscription => {
      this.client.removeChannel(subscription);
    });
    this.subscriptions.clear();
    this.isEnabled = false;
  }
}

// ========================================
// 4. SMART SYNC MANAGER
// ========================================

class SmartSyncManager {
  constructor(supabaseClient, userId) {
    this.client = supabaseClient;
    this.userId = userId;
    this.changeTracker = new ChangeTracker();
    this.batchProcessor = new BatchProcessor(supabaseClient);
    this.realtimeSync = new RealtimeSync(supabaseClient, userId);
    this.syncQueue = [];
    this.isSyncing = false;
    this.lastSyncTime = 0;
    this.syncInterval = 2000; // Sync every 2 seconds
  }
  
  // Initialize smart sync
  async initialize() {
    // Enable real-time sync
    this.realtimeSync.enableRealtimeSync((table, payload) => {
      this.handleRealtimeChange(table, payload);
    });
    
    // Start periodic sync
    this.startPeriodicSync();
  }
  
  // Handle real-time changes from other devices
  handleRealtimeChange(table, payload) {
    console.log(`Real-time change detected in ${table}:`, payload);
    
    // Update local state based on real-time changes
    switch (table) {
      case 'personal_expenses':
        this.updatePersonalExpenseFromRealtime(payload);
        break;
      case 'business_expenses':
        this.updateBusinessExpenseFromRealtime(payload);
        break;
      case 'income':
        this.updateIncomeFromRealtime(payload);
        break;
      case 'user_settings':
        this.updateSettingsFromRealtime(payload);
        break;
    }
  }
  
  // Smart sync - only sync what changed
  async smartSync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      const changes = this.changeTracker.getChanges();
      if (changes.length === 0) {
        console.log('No changes to sync');
        return;
      }
      
      console.log(`Syncing ${changes.length} changes...`);
      
      // Group changes by type
      const groupedChanges = this.groupChangesByType(changes);
      
      // Sync each type
      for (const [type, items] of groupedChanges) {
        await this.syncChangesByType(type, items);
      }
      
      // Clear changes after successful sync
      this.changeTracker.clearChanges();
      this.lastSyncTime = Date.now();
      
      console.log('Smart sync completed successfully');
      
    } catch (error) {
      console.error('Smart sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Group changes by table type
  groupChangesByType(changes) {
    const grouped = new Map();
    
    changes.forEach(change => {
      const type = change.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type).push(change);
    });
    
    return grouped;
  }
  
  // Sync changes by type using batch operations
  async syncChangesByType(type, changes) {
    const items = changes.map(change => change.data);
    
    switch (type) {
      case 'personal_expense':
        await this.batchProcessor.batchUpsert('personal_expenses', items);
        break;
      case 'business_expense':
        await this.batchProcessor.batchUpsert('business_expenses', items);
        break;
      case 'income':
        await this.batchProcessor.batchUpsert('income', items);
        break;
      case 'settings':
        await this.syncSettings(items[0]);
        break;
    }
  }
  
  // Sync settings (single item)
  async syncSettings(settings) {
    await this.client
      .from('user_settings')
      .upsert(settings, { onConflict: 'user_id' });
  }
  
  // Start periodic sync
  startPeriodicSync() {
    setInterval(() => {
      if (this.changeTracker.getChanges().length > 0) {
        this.smartSync();
      }
    }, this.syncInterval);
  }
  
  // Track a change
  trackChange(type, id, data) {
    this.changeTracker.trackChange(type, id, data);
  }
  
  // Force immediate sync
  async forceSync() {
    await this.smartSync();
  }
  
  // Cleanup
  destroy() {
    this.realtimeSync.disableRealtimeSync();
  }
}

// ========================================
// 5. CONFLICT RESOLUTION
// ========================================

class ConflictResolver {
  constructor() {
    this.conflictStrategies = {
      'last_write_wins': this.lastWriteWins,
      'merge': this.mergeChanges,
      'user_preference': this.userPreference
    };
  }
  
  // Resolve conflicts between local and remote changes
  resolveConflict(localData, remoteData, strategy = 'last_write_wins') {
    const resolver = this.conflictStrategies[strategy];
    if (!resolver) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }
    
    return resolver(localData, remoteData);
  }
  
  // Last write wins strategy
  lastWriteWins(localData, remoteData) {
    const localTime = new Date(localData.updated_at || localData.created_at);
    const remoteTime = new Date(remoteData.updated_at || remoteData.created_at);
    
    return localTime > remoteTime ? localData : remoteData;
  }
  
  // Merge changes strategy
  mergeChanges(localData, remoteData) {
    // Simple merge - prefer non-empty values
    const merged = { ...remoteData };
    
    Object.keys(localData).forEach(key => {
      if (localData[key] !== null && localData[key] !== undefined && localData[key] !== '') {
        merged[key] = localData[key];
      }
    });
    
    merged.updated_at = new Date().toISOString();
    return merged;
  }
  
  // User preference strategy
  userPreference(localData, remoteData) {
    // This would show a UI to let user choose
    // For now, default to last write wins
    return this.lastWriteWins(localData, remoteData);
  }
}

// ========================================
// 6. PERFORMANCE MONITORING
// ========================================

class SyncPerformanceMonitor {
  constructor() {
    this.metrics = {
      syncCount: 0,
      totalSyncTime: 0,
      averageSyncTime: 0,
      errorCount: 0,
      lastSyncTime: null
    };
  }
  
  // Record sync performance
  recordSync(duration, success = true) {
    this.metrics.syncCount++;
    this.metrics.totalSyncTime += duration;
    this.metrics.averageSyncTime = this.metrics.totalSyncTime / this.metrics.syncCount;
    this.metrics.lastSyncTime = new Date();
    
    if (!success) {
      this.metrics.errorCount++;
    }
    
    console.log(`Sync performance: ${duration}ms (avg: ${this.metrics.averageSyncTime.toFixed(2)}ms)`);
  }
  
  // Get performance metrics
  getMetrics() {
    return { ...this.metrics };
  }
  
  // Reset metrics
  reset() {
    this.metrics = {
      syncCount: 0,
      totalSyncTime: 0,
      averageSyncTime: 0,
      errorCount: 0,
      lastSyncTime: null
    };
  }
}

// ========================================
// 7. USAGE EXAMPLE
// ========================================

/*
// Initialize the smart sync system
const syncManager = new SmartSyncManager(supabaseClient, currentUser.id);
await syncManager.initialize();

// Track changes when user makes edits
syncManager.trackChange('personal_expense', expense.id, expense);

// Force sync when needed
await syncManager.forceSync();

// Cleanup when done
syncManager.destroy();
*/

// Make all classes available globally
window.ChangeTracker = ChangeTracker;
window.BatchProcessor = BatchProcessor;
window.RealtimeSync = RealtimeSync;
window.SmartSyncManager = SmartSyncManager;
window.ConflictResolver = ConflictResolver;
window.SyncPerformanceMonitor = SyncPerformanceMonitor;

// Also create a namespace object for organization
window.SyncOptimization = {
  ChangeTracker,
  BatchProcessor,
  RealtimeSync,
  SmartSyncManager,
  ConflictResolver,
  SyncPerformanceMonitor
};

console.log('✅ Sync optimization classes loaded and made globally available');
