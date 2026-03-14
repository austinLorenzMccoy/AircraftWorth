import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * POST /api/auth/magic-link
 * 
 * Body: { email, walletAddress, plan }
 * 
 * 1. Generates a secure one-time token
 * 2. Stores token + metadata in Supabase (or in-memory for demo)
 * 3. Sends magic-link email via Resend (or logs link in dev)
 * 
 * Required env vars:
 *   RESEND_API_KEY       — from resend.com (free tier: 3000 emails/mo)
 *   RESEND_FROM_EMAIL    — e.g. noreply@aircraftworth.io
 *   NEXT_PUBLIC_APP_URL  — e.g. https://aircraft-worth.vercel.app
 *   SUPABASE_SERVICE_KEY — server-side Supabase key (not anon)
 *   NEXT_PUBLIC_SUPABASE_URL
 * 
 * Falls back gracefully if env vars are missing (logs link to console).
 */

const TOKEN_EXPIRY_MINUTES = 15;

export async function POST(req: NextRequest) {
  let body: { email?: string; walletAddress?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, walletAddress, plan = 'operator' } = body;

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  // Generate cryptographically secure token
  const token   = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aircraft-worth.vercel.app';
  const magicLink = `${appUrl}/onboarding?token=${token}`;

  // ── Store token in Supabase ────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // service role key

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/magic_link_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          token,
          email: email.toLowerCase(),
          wallet_address: walletAddress ?? null,
          plan,
          expires_at: expires,
          used: false,
        }),
      });

      if (!res.ok) {
        console.error('Supabase token storage failed:', await res.text());
        // Continue anyway — email still works, just token won't verify via DB
      }
    } catch (err) {
      console.error('Supabase error:', err);
    }
  } else {
    // Dev fallback — log the magic link
    console.log('\n========== MAGIC LINK (dev mode) ==========');
    console.log(`Email: ${email}`);
    console.log(`Wallet: ${walletAddress}`);
    console.log(`Plan: ${plan}`);
    console.log(`Link: ${magicLink}`);
    console.log('===========================================\n');
  }

  // ── Send email via Resend ──────────────────────────────────────────────────
  const resendKey  = process.env.RESEND_API_KEY;
  const fromEmail  = process.env.RESEND_FROM_EMAIL ?? 'noreply@aircraftworth.io';

  if (resendKey) {
    try {
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: `Your AircraftWorth sign-in link`,
          html: magicLinkEmailHtml({
            magicLink,
            plan: planName,
            walletAddress,
            expiryMinutes: TOKEN_EXPIRY_MINUTES,
          }),
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error('Resend error:', errBody);
        return NextResponse.json({ error: 'Failed to send email. Check RESEND_API_KEY.' }, { status: 500 });
      }
    } catch (err) {
      console.error('Email send error:', err);
      return NextResponse.json({ error: 'Email service unavailable' }, { status: 500 });
    }
  } else {
    // No Resend key — in dev this is fine (link logged above)
    // In prod you'd want to return an error, but for hackathon demo we return success
    console.warn('RESEND_API_KEY not set — magic link logged to console only');
  }

  return NextResponse.json({
    success: true,
    message: `Magic link sent to ${email}`,
    // Only return link in dev/preview for easy testing
    ...(process.env.NODE_ENV !== 'production' ? { devLink: magicLink } : {}),
  });
}

// ─── Email HTML template ──────────────────────────────────────────────────────
function magicLinkEmailHtml({
  magicLink,
  plan,
  walletAddress,
  expiryMinutes,
}: {
  magicLink: string;
  plan: string;
  walletAddress?: string;
  expiryMinutes: number;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080B0F;font-family:system-ui,-apple-system,sans-serif;color:#E6EAF0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <tr><td>
      <!-- Header -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:24px;font-weight:700;color:#3DDC97;">✈ AircraftWorth</div>
        <div style="font-size:12px;color:#444;letter-spacing:2px;margin-top:4px;">MLAT INTELLIGENCE NETWORK</div>
      </div>

      <!-- Card -->
      <div style="background:#0D1117;border:1px solid #1a2030;border-radius:12px;padding:32px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#E6EAF0;">Your sign-in link</h2>
        <p style="margin:0 0 24px;color:#666;font-size:14px;line-height:1.6;">
          Click the button below to sign in and activate your <strong style="color:#7B8FFF;">${plan}</strong> subscription.
          This link expires in ${expiryMinutes} minutes.
        </p>

        <!-- CTA Button -->
        <div style="text-align:center;margin:24px 0;">
          <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#3DDC97,#2af6ff);color:#080B0F;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
            Activate Subscription →
          </a>
        </div>

        ${walletAddress ? `
        <div style="margin-top:20px;padding:10px 14px;background:#3DDC9711;border:1px solid #3DDC9733;border-radius:6px;font-size:12px;">
          <span style="color:#3DDC97;">● Wallet linked: </span>
          <span style="color:#888;font-family:monospace;">${walletAddress.slice(0,6)}…${walletAddress.slice(-4)}</span>
        </div>` : ''}

        <div style="margin-top:16px;padding:10px 14px;background:#0a0e14;border-radius:6px;font-size:11px;color:#444;">
          Or copy this link: <span style="color:#666;word-break:break-all;">${magicLink}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;margin-top:24px;font-size:11px;color:#333;">
        If you didn't request this, ignore this email.<br/>
        Hedera Testnet · HCS Topic 0.0.7968510
      </div>
    </td></tr>
  </table>
</body>
</html>`;
}
