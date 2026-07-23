/**
 * Supabase Keep-Alive Ping Script
 * Implements the exact delete+insert hearth-pulse pattern using native fetch.
 * Runs in the cloud via GitHub Actions so the DB never goes idle.
 */

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️  Warning: Supabase credentials are not configured.");
  console.warn("   To enable the keep-alive ping, add these secrets to your GitHub repository:");
  console.warn("   - SUPABASE_URL  (Settings → Secrets and variables → Actions → New repository secret)");
  console.warn("   - SUPABASE_KEY  (your Supabase anon/service key)");
  console.warn("   Skipping ping — workflow will still pass (exit 0) until credentials are set.");
  process.exit(0); // Exit successfully so GitHub does NOT send failure emails
}

// Clean up trailing slash from URL if present
const baseUrl = supabaseUrl.replace(/\/$/, "");

async function keepAlive() {
  try {
    console.log("💓 Starting Supabase Hearth-Pulse Keep-Alive Ping...");

    // Step 1: DELETE all rows from the hearth_pulse table (except id = 0, though we delete all matching)
    console.log("Step 1: Deleting existing ping rows...");
    const deleteRes = await fetch(`${baseUrl}/rest/v1/hearth_pulse?id=neq.0`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      throw new Error(`DELETE request failed with status ${deleteRes.status}: ${errText}`);
    }
    console.log("✅ Successfully deleted old ping records.");

    // Step 2: INSERT a new row with a timestamp/random string
    console.log("Step 2: Inserting a fresh ping row...");
    const uniqueName = `cron-ping-${new Date().toISOString()}-${Math.random().toString(36).substr(2, 9)}`;
    const insertRes = await fetch(`${baseUrl}/rest/v1/hearth_pulse`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ name: uniqueName })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`INSERT request failed with status ${insertRes.status}: ${errText}`);
    }
    console.log("✅ Successfully inserted new ping record.");
    console.log("💓 Supabase Hearth-Pulse completed successfully!");

  } catch (error) {
    console.error("❌ Hearth-Pulse failed:", error.message);
    process.exit(1);
  }
}

keepAlive();
