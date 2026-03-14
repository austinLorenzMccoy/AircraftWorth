import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/verify
 * 
 * Body: { token: string }
 * 
 * 1. Looks up token in Supabase magic_link_tokens table
 * 2. Checks not expired and not already used
 * 3. Marks token as used
 * 4. Upserts subscriber record in `subscribers` table
 * 5. Returns { email, walletAddress, plan }
 * 
 * Supabase table required (run in SQL editor):
 * 
 *   CREATE TABLE IF NOT EXISTS magic_link_tokens (
 *     id           BIGSERIAL PRIMARY KEY,
 *     token        TEXT UNIQUE NOT NULL,
 *     email        TEXT NOT NULL,
 *     wallet_address TEXT,
 *     plan         TEXT DEFAULT 'operator',
 *     expires_at   TIMESTAMPTZ NOT NULL,
 *     used         BOOLEAN DEFAULT FALSE,
 *     created_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 * 
 *   CREATE TABLE IF NOT EXISTS subscribers (
 *     id             BIGSERIAL PRIMARY KEY,
 *     email          TEXT UNIQUE NOT NULL,
 *     wallet_address TEXT,
 *     plan           TEXT DEFAULT 'observer',
 *     enrolled_at    TIMESTAMPTZ DEFAULT NOW(),
 *     active         BOOLEAN DEFAULT TRUE
 *   );
 */

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== 'string' || token.length < 32) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  // ── Dev/demo fallback — no Supabase configured ────────────────────────────
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured — accepting token in demo mode');
    return NextResponse.json({
      success: true,
      email: 'demo@aircraftworth.io',
      walletAddress: null,
      plan: 'operator',
      demo: true,
    });
  }

  // ── Look up token ─────────────────────────────────────────────────────────
  const lookupRes = await fetch(
    `${supabaseUrl}/rest/v1/magic_link_tokens?token=eq.${encodeURIComponent(token)}&select=*&limit=1`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!lookupRes.ok) {
    return NextResponse.json({ error: 'Database error during token lookup' }, { status: 500 });
  }

  const rows: Array<{
    id: number;
    token: string;
    email: string;
    wallet_address: string | null;
    plan: string;
    expires_at: string;
    used: boolean;
  }> = await lookupRes.json();

  if (!rows.length) {
    return NextResponse.json({ error: 'Invalid or expired magic link' }, { status: 401 });
  }

  const row = rows[0];

  if (row.used) {
    return NextResponse.json({ error: 'This link has already been used' }, { status: 401 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Magic link has expired. Please request a new one.' }, { status: 401 });
  }

  // ── Mark token as used ────────────────────────────────────────────────────
  await fetch(
    `${supabaseUrl}/rest/v1/magic_link_tokens?id=eq.${row.id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ used: true }),
    }
  );

  // ── Upsert subscriber ─────────────────────────────────────────────────────
  await fetch(
    `${supabaseUrl}/rest/v1/subscribers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        email: row.email,
        wallet_address: row.wallet_address,
        plan: row.plan,
        enrolled_at: new Date().toISOString(),
        active: true,
      }),
    }
  );

  return NextResponse.json({
    success: true,
    email: row.email,
    walletAddress: row.wallet_address,
    plan: row.plan,
  });
}
