// 🚀 SYNC SYSTEM LOADER
// This file loads all sync components in the correct order

// ========================================
// 1. LOAD CORE SYNC CLASSES
// ========================================

// Load the core optimization classes first
const syncScript = document.createElement('script');
syncScript.src = 'sync/sync_optimization.js';
syncScript.onload = function() {
  console.log('✅ Core sync classes loaded');
  window.syncSystemStatus.coreLoaded = true;
  
  // Load the integration functions after core classes
  const integrationScript = document.createElement('script');
  integrationScript.src = 'sync/optimized_sync_integration.js';
  integrationScript.onload = function() {
    console.log('✅ Sync integration loaded');
    window.syncSystemStatus.integrationLoaded = true;
    
    // Load test file for development/testing
    const testScript = document.createElement('script');
    testScript.src = 'sync/test_sync_functionality.js';
    testScript.onload = function() {
      console.log('✅ Sync tests loaded');
    };
    testScript.onerror = function() {
      console.warn('⚠️ Sync tests not loaded (this is optional)');
    };
    document.head.appendChild(testScript);
    
    // Check if all classes are available
    setTimeout(() => {
      const classesAvailable = typeof window.SmartSyncManager !== 'undefined' && 
                              typeof window.initializeOptimizedSync === 'function';
      
      if (classesAvailable) {
        window.syncSystemStatus.ready = true;
        console.log('🚀 Sync system ready for initialization');
        console.log('Available classes:', {
          SmartSyncManager: typeof window.SmartSyncManager,
          initializeOptimizedSync: typeof window.initializeOptimizedSync,
          ChangeTracker: typeof window.ChangeTracker,
          BatchProcessor: typeof window.BatchProcessor
        });
        
        // Auto-run basic tests in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          setTimeout(() => {
            if (typeof window.runComprehensiveSyncTest === 'function') {
              console.log('🧪 Auto-running sync tests in development mode...');
              window.runComprehensiveSyncTest();
            }
          }, 1000);
        }
      } else {
        console.warn('⚠️ Sync classes not fully loaded yet');
      }
    }, 100);
  };
  integrationScript.onerror = function() {
    console.error('❌ Failed to load sync integration');
    window.syncSystemStatus.integrationLoaded = false;
  };
  document.head.appendChild(integrationScript);
};
syncScript.onerror = function() {
  console.error('❌ Failed to load core sync classes');
  window.syncSystemStatus.coreLoaded = false;
};
document.head.appendChild(syncScript);

// ========================================
// 2. SYNC SYSTEM STATUS
// ========================================

// Global sync status tracker
window.syncSystemStatus = {
  coreLoaded: false,
  integrationLoaded: false,
  initialized: false,
  ready: false
};

// Check if sync system is ready
function isSyncSystemReady() {
  return window.syncSystemStatus.coreLoaded && 
         window.syncSystemStatus.integrationLoaded && 
         typeof window.SmartSyncManager !== 'undefined' &&
         typeof window.initializeOptimizedSync === 'function';
}

// Make this function globally available
window.isSyncSystemReady = isSyncSystemReady;

// ========================================
// 3. FALLBACK HANDLING
// ========================================

// If sync files fail to load, the app will fall back to the original sync system
// This ensures the app continues to work even if sync optimization fails

console.log('🔄 Sync system loader initialized');
