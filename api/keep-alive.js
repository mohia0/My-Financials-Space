/**
 * Vercel Serverless Function for Hearth-Pulse Keep-Alive
 * This runs on a schedule (cron job) managed by Vercel.
 */

export default async function handler(req, res) {
  // Read keys from Vercel environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: "Missing Supabase credentials. Make sure SUPABASE_URL and SUPABASE_KEY are set in your Vercel Environment Variables."
    });
  }

  const baseUrl = supabaseUrl.replace(/\/$/, "");

  try {
    console.log("💓 Running Vercel Hearth-Pulse Keep-Alive Ping...");

    // Step 1: DELETE all rows from the hearth_pulse table
    const deleteRes = await fetch(`${baseUrl}/rest/v1/hearth_pulse?id=neq.0`, {
      method: "DELETE",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      throw new Error(`DELETE failed: ${deleteRes.status} ${errText}`);
    }

    // Step 2: INSERT a new row
    const uniqueName = `vercel-ping-${new Date().toISOString()}`;
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
      throw new Error(`INSERT failed: ${insertRes.status} ${errText}`);
    }

    console.log("💓 Vercel Hearth-Pulse completed successfully!");
    return res.status(200).json({
      success: true,
      message: "Hearth-pulse ping completed successfully."
    });

  } catch (error) {
    console.error("❌ Hearth-Pulse failed:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
