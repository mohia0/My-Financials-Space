/**
 * Sync System Loader
 * Loads the new Supabase sync system
 */

console.log('🔄 Loading Supabase sync system...');

// Load the sync system components
const syncScript = document.createElement('script');
syncScript.src = 'sync/supabase_sync.js';
syncScript.onload = () => {
  console.log('✅ Supabase sync core loaded');
  
  // Load the integration layer
  const integrationScript = document.createElement('script');
  integrationScript.src = 'sync/sync_integration.js';
  integrationScript.onload = () => {
    console.log('✅ Sync integration loaded');
    console.log('🚀 Supabase sync system ready');
    
    // Set global status
    window.syncSystemReady = true;
    
    // Dispatch ready event
    window.dispatchEvent(new CustomEvent('syncSystemReady'));
  };
  integrationScript.onerror = () => {
    console.error('❌ Failed to load sync integration');
  };
  document.head.appendChild(integrationScript);
};
syncScript.onerror = () => {
  console.error('❌ Failed to load Supabase sync core');
};
document.head.appendChild(syncScript);
