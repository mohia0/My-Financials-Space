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

    // Fix race condition: if user was already signed in when scripts loaded,
    // onAuthStateChange already fired but initializeSync wasn't available yet.
    // Trigger it now if a user session exists.
    const tryAutoInit = async () => {
      if (window.currentUser && typeof window.initializeSync === 'function' && typeof window.isInitialized !== 'undefined' && !window.isInitialized) {
        console.log('💓 Sync system ready — auto-initializing for already signed-in user...');
        try {
          await window.initializeSync();
          if (typeof window.loadFromSupabase === 'function') {
            await window.loadFromSupabase();
          }
        } catch (e) {
          console.warn('⚠️ Auto-init after load failed:', e);
        }
      } else if (window.supabaseClient) {
        // Double-check via Supabase session
        const { data: { session } } = await window.supabaseClient.auth.getSession().catch(() => ({ data: {} }));
        if (session?.user && typeof window.initializeSync === 'function' && !window.isInitialized) {
          window.currentUser = session.user;
          console.log('💓 Session found — auto-initializing hearth-pulse...');
          try {
            await window.initializeSync();
            if (typeof window.loadFromSupabase === 'function') {
              await window.loadFromSupabase();
            }
          } catch (e) {
            console.warn('⚠️ Auto-init via session failed:', e);
          }
        }
      }
    };

    // Small delay to let script.js finish setting up currentUser
    setTimeout(tryAutoInit, 500);
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
