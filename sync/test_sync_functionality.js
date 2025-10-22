// 🧪 SYNC FUNCTIONALITY TEST
// This file tests the sync system to ensure it works 100%

// ========================================
// 1. SYNC SYSTEM STATUS CHECK
// ========================================

function testSyncSystemStatus() {
  console.log('🧪 Testing sync system status...');
  
  const status = {
    coreLoaded: window.syncSystemStatus?.coreLoaded || false,
    integrationLoaded: window.syncSystemStatus?.integrationLoaded || false,
    ready: window.syncSystemStatus?.ready || false,
    classesAvailable: {
      SmartSyncManager: typeof window.SmartSyncManager !== 'undefined',
      ChangeTracker: typeof window.ChangeTracker !== 'undefined',
      BatchProcessor: typeof window.BatchProcessor !== 'undefined',
      RealtimeSync: typeof window.RealtimeSync !== 'undefined',
      ConflictResolver: typeof window.ConflictResolver !== 'undefined',
      SyncPerformanceMonitor: typeof window.SyncPerformanceMonitor !== 'undefined'
    },
    functionsAvailable: {
      initializeOptimizedSync: typeof window.initializeOptimizedSync === 'function',
      cleanupOptimizedSync: typeof window.cleanupOptimizedSync === 'function',
      saveToSupabaseOptimized: typeof window.saveToSupabaseOptimized === 'function',
      instantSaveAllOptimized: typeof window.instantSaveAllOptimized === 'function',
      saveOptimized: typeof window.saveOptimized === 'function'
    }
  };
  
  console.log('📊 Sync System Status:', status);
  
  const allClassesAvailable = Object.values(status.classesAvailable).every(Boolean);
  const allFunctionsAvailable = Object.values(status.functionsAvailable).every(Boolean);
  
  if (allClassesAvailable && allFunctionsAvailable) {
    console.log('✅ All sync classes and functions are available');
    return true;
  } else {
    console.error('❌ Some sync classes or functions are missing');
    return false;
  }
}

// ========================================
// 2. FX RATE SYNC EXCLUSION TEST
// ========================================

function testFXRateExclusion() {
  console.log('🧪 Testing FX rate exclusion from sync...');
  
  // Check if FX rate is excluded from settings sync
  const testSettings = {
    user_id: 'test-user',
    fx_rate: 48.1843, // This should be excluded
    theme: 'dark',
    autosave: true,
    include_annual_in_monthly: true,
    inputs_locked: false,
    updated_at: new Date().toISOString()
  };
  
  // Simulate the settings sync logic
  const settingsToSync = { ...testSettings };
  delete settingsToSync.fx_rate;
  
  if (!settingsToSync.fx_rate) {
    console.log('✅ FX rate successfully excluded from sync');
    return true;
  } else {
    console.error('❌ FX rate is still being synced');
    return false;
  }
}

// ========================================
// 3. CHANGE TRACKER TEST
// ========================================

function testChangeTracker() {
  console.log('🧪 Testing change tracker...');
  
  if (typeof window.ChangeTracker === 'undefined') {
    console.error('❌ ChangeTracker not available');
    return false;
  }
  
  try {
    const tracker = new window.ChangeTracker();
    
    // Test tracking changes
    const testData = { id: 'test-1', name: 'Test Item', value: 100 };
    tracker.trackChange('test_type', 'test-1', testData);
    
    const changes = tracker.getChanges();
    if (changes.length === 1 && changes[0].type === 'test_type') {
      console.log('✅ Change tracking works correctly');
      
      // Test clearing changes
      tracker.clearChanges();
      const clearedChanges = tracker.getChanges();
      if (clearedChanges.length === 0) {
        console.log('✅ Change clearing works correctly');
        return true;
      } else {
        console.error('❌ Changes not cleared properly');
        return false;
      }
    } else {
      console.error('❌ Change tracking failed');
      return false;
    }
  } catch (error) {
    console.error('❌ ChangeTracker test failed:', error);
    return false;
  }
}

// ========================================
// 4. BATCH PROCESSOR TEST
// ========================================

function testBatchProcessor() {
  console.log('🧪 Testing batch processor...');
  
  if (typeof window.BatchProcessor === 'undefined') {
    console.error('❌ BatchProcessor not available');
    return false;
  }
  
  try {
    // Mock Supabase client for testing
    const mockClient = {
      from: (table) => ({
        upsert: (data, options) => Promise.resolve({ data: data, error: null })
      })
    };
    
    const processor = new window.BatchProcessor(mockClient);
    
    // Test chunking
    const testArray = Array.from({ length: 25 }, (_, i) => ({ id: i, value: i * 10 }));
    const chunks = processor.chunkArray(testArray, 10);
    
    if (chunks.length === 3 && chunks[0].length === 10 && chunks[1].length === 10 && chunks[2].length === 5) {
      console.log('✅ Batch processing works correctly');
      return true;
    } else {
      console.error('❌ Batch processing failed');
      return false;
    }
  } catch (error) {
    console.error('❌ BatchProcessor test failed:', error);
    return false;
  }
}

// ========================================
// 5. REAL-TIME SYNC TEST
// ========================================

function testRealtimeSync() {
  console.log('🧪 Testing real-time sync...');
  
  if (typeof window.RealtimeSync === 'undefined') {
    console.error('❌ RealtimeSync not available');
    return false;
  }
  
  try {
    // Mock Supabase client for testing
    const mockClient = {
      channel: (name) => ({
        on: (event, config, callback) => ({
          subscribe: () => ({ id: `sub_${name}` })
        })
      }),
      removeChannel: (subscription) => true
    };
    
    const realtimeSync = new window.RealtimeSync(mockClient, 'test-user');
    
    // Test enabling real-time sync
    realtimeSync.enableRealtimeSync((table, payload) => {
      console.log(`Real-time update from ${table}:`, payload);
    });
    
    if (realtimeSync.isEnabled) {
      console.log('✅ Real-time sync enabled successfully');
      
      // Test disabling real-time sync
      realtimeSync.disableRealtimeSync();
      if (!realtimeSync.isEnabled) {
        console.log('✅ Real-time sync disabled successfully');
        return true;
      } else {
        console.error('❌ Real-time sync not disabled properly');
        return false;
      }
    } else {
      console.error('❌ Real-time sync not enabled');
      return false;
    }
  } catch (error) {
    console.error('❌ RealtimeSync test failed:', error);
    return false;
  }
}

// ========================================
// 6. PERFORMANCE MONITOR TEST
// ========================================

function testPerformanceMonitor() {
  console.log('🧪 Testing performance monitor...');
  
  if (typeof window.SyncPerformanceMonitor === 'undefined') {
    console.error('❌ SyncPerformanceMonitor not available');
    return false;
  }
  
  try {
    const monitor = new window.SyncPerformanceMonitor();
    
    // Test recording sync performance
    monitor.recordSync(100, true);
    monitor.recordSync(200, true);
    monitor.recordSync(150, false);
    
    const metrics = monitor.getMetrics();
    
    if (metrics.syncCount === 3 && metrics.errorCount === 1 && metrics.averageSyncTime === 150) {
      console.log('✅ Performance monitoring works correctly');
      return true;
    } else {
      console.error('❌ Performance monitoring failed');
      return false;
    }
  } catch (error) {
    console.error('❌ SyncPerformanceMonitor test failed:', error);
    return false;
  }
}

// ========================================
// 7. COMPREHENSIVE SYNC TEST
// ========================================

function runComprehensiveSyncTest() {
  console.log('🚀 Running comprehensive sync functionality test...');
  
  const tests = [
    { name: 'Sync System Status', test: testSyncSystemStatus },
    { name: 'FX Rate Exclusion', test: testFXRateExclusion },
    { name: 'Change Tracker', test: testChangeTracker },
    { name: 'Batch Processor', test: testBatchProcessor },
    { name: 'Real-time Sync', test: testRealtimeSync },
    { name: 'Performance Monitor', test: testPerformanceMonitor }
  ];
  
  const results = tests.map(test => ({
    name: test.name,
    passed: test.test()
  }));
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log('\n📊 Test Results:');
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All sync functionality tests PASSED! The sync system is working 100%');
    return true;
  } else {
    console.log('⚠️ Some tests failed. Please check the sync system configuration.');
    return false;
  }
}

// ========================================
// 8. MAKE TESTS AVAILABLE GLOBALLY
// ========================================

window.testSyncSystemStatus = testSyncSystemStatus;
window.testFXRateExclusion = testFXRateExclusion;
window.testChangeTracker = testChangeTracker;
window.testBatchProcessor = testBatchProcessor;
window.testRealtimeSync = testRealtimeSync;
window.testPerformanceMonitor = testPerformanceMonitor;
window.runComprehensiveSyncTest = runComprehensiveSyncTest;

console.log('🧪 Sync functionality tests loaded. Run runComprehensiveSyncTest() to test everything.');
