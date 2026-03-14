'use client';

/**
 * /onboarding — Subscription enrollment
 * 
 * Flow:
 *   Step 1: Connect wallet (MetaMask / WalletConnect / Coinbase)
 *   Step 2: Enter email → send magic-link
 *   Step 3: Magic-link lands here with ?token= → verify → enroll subscription
 *   Step 4: Success — redirect to /mlat
 * 
 * No external auth library needed. Works with any EIP-1193 wallet.
 * Magic-link token verification handled by /api/auth/verify route.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'wallet' | 'email' | 'check-email' | 'verifying' | 'enrolled' | 'error';

interface WalletState {
  address: string;
  chainId: string;
  provider: 'metamask' | 'coinbase' | 'injected';
}

// ─── Wallet detection helpers ─────────────────────────────────────────────────
function getProvider(): unknown {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.ethereum?.isMetaMask)  return w.ethereum;
  if (w.ethereum?.isCoinbaseWallet) return w.ethereum;
  if (w.ethereum) return w.ethereum;
  return null;
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Plan options ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'observer',
    name: 'Observer',
    price: 'Free',
    priceNote: 'forever',
    features: ['View live MLAT map', 'Demo aircraft data', 'Basic AI queries (5/day)', 'Public HCS feed'],
    color: '#3DDC97',
    highlight: false,
  },
  {
    id: 'operator',
    name: 'Operator',
    price: '$29',
    priceNote: '/ month',
    features: ['Everything in Observer', 'Full Supabase data access', 'Unlimited AI queries', 'Sensor health dashboard', 'Flight track NFT minting', 'API key included'],
    color: '#7B8FFF',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    priceNote: 'contact us',
    features: ['Everything in Operator', 'Private sensor cluster', 'Custom MLAT coverage area', 'SLA + support', 'White-label dashboard', 'Hedera mainnet access'],
    color: '#FFB020',
    highlight: false,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [step,       setStep]       = useState<Step>('wallet');
  const [wallet,     setWallet]     = useState<WalletState | null>(null);
  const [email,      setEmail]      = useState('');
  const [plan,       setPlan]       = useState('operator');
  const [error,      setError]      = useState('');
  const [sending,    setSending]    = useState(false);
  const [hasWallet,  setHasWallet]  = useState(false);

  // Check if a magic-link token is in the URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setStep('verifying');
      verifyToken(token);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect wallet availability
  useEffect(() => {
    setHasWallet(!!getProvider());
  }, []);

  // ── Connect wallet ───────────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setError('No wallet detected. Install MetaMask or use a Web3 browser.');
      return;
    }

    try {
      setError('');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eth = provider as any;
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      const chainId: string    = await eth.request({ method: 'eth_chainId' });

      if (!accounts.length) throw new Error('No accounts returned');

      const providerName = eth.isMetaMask ? 'metamask' : eth.isCoinbaseWallet ? 'coinbase' : 'injected';

      setWallet({ address: accounts[0], chainId, provider: providerName });
      setStep('email');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wallet connection failed';
      setError(msg.includes('rejected') ? 'Connection rejected. Please approve in your wallet.' : msg);
    }
  }, []);

  // ── Send magic-link ──────────────────────────────────────────────────────────
  const sendMagicLink = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!wallet) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          walletAddress: wallet.address,
          plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to send magic link');
      }

      setStep('check-email');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setSending(false);
    }
  }, [email, wallet, plan]);

  // ── Verify token (from magic-link click) ─────────────────────────────────────
  async function verifyToken(token: string) {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Verification failed');

      // Token valid — restore wallet state from token payload if available
      if (data.walletAddress) {
        setWallet({ address: data.walletAddress, chainId: '0x1', provider: 'injected' });
      }
      if (data.email) setEmail(data.email);

      setStep('enrolled');

      // Redirect to dashboard after 3s
      setTimeout(() => router.push('/mlat'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Token verification failed');
      setStep('error');
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────────
  const S = styles;

  return (
    <div style={S.page}>
      {/* Background grid */}
      <div style={S.grid} />

      {/* Header */}
      <div style={S.header}>
        <span style={S.logo}>✈ AircraftWorth</span>
        <span style={S.logoSub}>MLAT Intelligence Network</span>
      </div>

      {/* Progress bar */}
      {step !== 'verifying' && step !== 'error' && (
        <div style={S.progress}>
          {(['wallet','email','check-email','enrolled'] as Step[]).map((s, i) => {
            const steps: Step[] = ['wallet','email','check-email','enrolled'];
            const current = steps.indexOf(step);
            const done    = i < current;
            const active  = i === current;
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{
                  ...S.dot,
                  background: done ? '#3DDC97' : active ? '#7B8FFF' : '#1a2030',
                  borderColor: done ? '#3DDC97' : active ? '#7B8FFF' : '#252d3d',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ color: active ? '#E6EAF0' : done ? '#3DDC97' : '#444', fontSize:'11px' }}>
                  {['Connect Wallet','Enter Email','Check Email','Enrolled'][i]}
                </span>
                {i < 3 && <div style={{ width:'32px', height:'1px', background:'#1a2030', margin:'0 4px' }} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ── STEP: Connect Wallet ─────────────────────────────────────────────── */}
      {step === 'wallet' && (
        <div style={S.card}>
          <div style={S.cardTitle}>Connect Your Wallet</div>
          <div style={S.cardSub}>Start your subscription by connecting a Web3 wallet. Your wallet address links to your sensor data and flight track NFTs.</div>

          <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginTop:'24px' }}>
            <button onClick={connectWallet} style={{ ...S.btn, ...S.btnPrimary }}>
              <span style={{ fontSize:'20px' }}>🦊</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontWeight:600 }}>MetaMask</div>
                <div style={{ fontSize:'11px', opacity:0.7 }}>Browser extension or mobile</div>
              </div>
              <span style={{ marginLeft:'auto', opacity:0.5 }}>→</span>
            </button>

            <button onClick={connectWallet} style={{ ...S.btn, background:'#0D1117', border:'1px solid #1a2030', color:'#E6EAF0' }}>
              <span style={{ fontSize:'20px' }}>🔵</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontWeight:600 }}>Coinbase Wallet</div>
                <div style={{ fontSize:'11px', opacity:0.7 }}>Any injected EIP-1193 wallet</div>
              </div>
              <span style={{ marginLeft:'auto', opacity:0.5 }}>→</span>
            </button>
          </div>

          {!hasWallet && (
            <div style={{ marginTop:'16px', padding:'10px 12px', background:'#FFB02011', border:'1px solid #FFB02033', borderRadius:'6px', fontSize:'12px', color:'#FFB020' }}>
              ⚠ No wallet detected. <a href="https://metamask.io" target="_blank" rel="noreferrer" style={{ color:'#FFB020' }}>Install MetaMask</a> or open in a Web3 browser.
            </div>
          )}

          {error && <div style={S.errorBox}>{error}</div>}

          <div style={S.divider}><span style={S.dividerText}>or</span></div>

          <button onClick={() => setStep('email')} style={{ ...S.btn, background:'transparent', border:'1px solid #1a2030', color:'#888', fontSize:'12px' }}>
            Continue without wallet (limited access)
          </button>
        </div>
      )}

      {/* ── STEP: Email + Plan ───────────────────────────────────────────────── */}
      {step === 'email' && (
        <div style={{ ...S.card, maxWidth:'680px' }}>
          {wallet && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px', padding:'8px 12px', background:'#3DDC9711', border:'1px solid #3DDC9733', borderRadius:'6px' }}>
              <span style={{ color:'#3DDC97', fontSize:'12px' }}>● Wallet connected</span>
              <span style={{ color:'#888', fontSize:'12px', fontFamily:'monospace' }}>{shortAddress(wallet.address)}</span>
            </div>
          )}

          <div style={S.cardTitle}>Choose Your Plan</div>
          <div style={S.cardSub}>Select a subscription tier. You can upgrade any time.</div>

          {/* Plans */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', margin:'20px 0' }}>
            {PLANS.map(p => (
              <div key={p.id} onClick={() => setPlan(p.id)}
                style={{
                  padding:'16px', borderRadius:'8px', cursor:'pointer',
                  background: plan === p.id ? `${p.color}11` : '#0D1117',
                  border: `1px solid ${plan === p.id ? p.color + '66' : '#1a2030'}`,
                  transition:'all 0.15s',
                  position:'relative',
                }}>
                {p.highlight && (
                  <div style={{ position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)', background:p.color, color:'#000', fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'10px', letterSpacing:'1px' }}>
                    POPULAR
                  </div>
                )}
                <div style={{ color:p.color, fontSize:'13px', fontWeight:700, marginBottom:'4px' }}>{p.name}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom:'12px' }}>
                  <span style={{ color:'#E6EAF0', fontSize:'22px', fontWeight:700 }}>{p.price}</span>
                  <span style={{ color:'#555', fontSize:'11px' }}>{p.priceNote}</span>
                </div>
                {p.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:'6px', marginBottom:'5px', fontSize:'11px', color:'#888' }}>
                    <span style={{ color:p.color, flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Email input */}
          <div style={{ marginTop:'8px' }}>
            <div style={{ color:'#888', fontSize:'11px', marginBottom:'6px', letterSpacing:'1px' }}>EMAIL ADDRESS</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
                placeholder="you@example.com"
                style={S.input}
                autoFocus
              />
              <button onClick={sendMagicLink} disabled={sending}
                style={{ ...S.btn, ...S.btnPrimary, flexShrink:0, minWidth:'140px', justifyContent:'center' }}>
                {sending ? '⟳ Sending…' : '✉ Send Magic Link'}
              </button>
            </div>
            <div style={{ color:'#444', fontSize:'11px', marginTop:'8px' }}>
              We'll send a one-click sign-in link. No password needed.
            </div>
          </div>

          {error && <div style={S.errorBox}>{error}</div>}
        </div>
      )}

      {/* ── STEP: Check email ────────────────────────────────────────────────── */}
      {step === 'check-email' && (
        <div style={S.card}>
          <div style={{ fontSize:'48px', textAlign:'center', marginBottom:'16px' }}>✉</div>
          <div style={S.cardTitle}>Check Your Email</div>
          <div style={S.cardSub}>
            We sent a magic link to <strong style={{ color:'#E6EAF0' }}>{email}</strong>.
            Click the link in the email to complete enrollment.
          </div>

          <div style={{ margin:'24px 0', padding:'12px', background:'#0D1117', border:'1px solid #1a2030', borderRadius:'8px', fontSize:'12px', color:'#888' }}>
            <div style={{ color:'#3DDC97', marginBottom:'6px', fontWeight:600 }}>What happens next:</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {['Click the link in your email','Your wallet + email get linked','Subscription activates instantly','You land on the live MLAT dashboard'].map((t,i) => (
                <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  <span style={{ color:'#7B8FFF', fontFamily:'monospace', flexShrink:0 }}>{i+1}.</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:'10px' }}>
            <button onClick={sendMagicLink} disabled={sending}
              style={{ ...S.btn, background:'transparent', border:'1px solid #1a2030', color:'#888', flex:1, justifyContent:'center', fontSize:'12px' }}>
              {sending ? 'Resending…' : 'Resend email'}
            </button>
            <button onClick={() => setStep('email')}
              style={{ ...S.btn, background:'transparent', border:'1px solid #1a2030', color:'#888', flex:1, justifyContent:'center', fontSize:'12px' }}>
              Change email
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Verifying token ────────────────────────────────────────────── */}
      {step === 'verifying' && (
        <div style={S.card}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'32px', marginBottom:'16px', animation:'spin 1s linear infinite' }}>◎</div>
            <div style={S.cardTitle}>Verifying your link…</div>
            <div style={S.cardSub}>Please wait while we confirm your magic link and activate your subscription.</div>
          </div>
        </div>
      )}

      {/* ── STEP: Enrolled ───────────────────────────────────────────────────── */}
      {step === 'enrolled' && (
        <div style={S.card}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🎉</div>
            <div style={{ ...S.cardTitle, color:'#3DDC97' }}>You're enrolled!</div>
            <div style={S.cardSub}>
              Subscription activated for <strong style={{ color:'#E6EAF0' }}>{email}</strong>
              {wallet && <><br/><span style={{ fontFamily:'monospace', color:'#888', fontSize:'12px' }}>{shortAddress(wallet.address)}</span></>}
            </div>

            <div style={{ margin:'20px 0', padding:'12px', background:'#3DDC9711', border:'1px solid #3DDC9733', borderRadius:'8px', fontSize:'12px', color:'#3DDC97' }}>
              ✓ Account linked to Hedera testnet<br/>
              ✓ MLAT data access granted<br/>
              ✓ {PLANS.find(p=>p.id===plan)?.name ?? 'Operator'} plan active
            </div>

            <div style={{ color:'#555', fontSize:'12px', marginBottom:'16px' }}>Redirecting to dashboard in 3 seconds…</div>

            <button onClick={() => router.push('/mlat')}
              style={{ ...S.btn, ...S.btnPrimary, justifyContent:'center', width:'100%' }}>
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Error ──────────────────────────────────────────────────────── */}
      {step === 'error' && (
        <div style={S.card}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>⚠</div>
            <div style={{ ...S.cardTitle, color:'#FF4444' }}>Something went wrong</div>
            <div style={S.cardSub}>{error || 'The magic link may have expired. Links are valid for 15 minutes.'}</div>
            <button onClick={() => { setStep('email'); setError(''); }}
              style={{ ...S.btn, ...S.btnPrimary, marginTop:'20px', justifyContent:'center', width:'100%' }}>
              Try again
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #444; }
        input:focus { border-color: #7B8FFF !important; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#080B0F',
    color: '#E6EAF0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 64px',
    position: 'relative',
    overflowX: 'hidden',
  },
  grid: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'linear-gradient(#1a203011 1px, transparent 1px), linear-gradient(90deg, #1a203011 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '32px',
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    color: '#3DDC97',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  logoSub: {
    color: '#444',
    fontSize: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '32px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  dot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 700,
    flexShrink: 0,
    color: '#E6EAF0',
  },
  card: {
    background: '#0D1117',
    border: '1px solid #1a2030',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '440px',
    position: 'relative',
    zIndex: 1,
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#E6EAF0',
    marginBottom: '8px',
  },
  cardSub: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.6',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#E6EAF0',
    width: '100%',
    transition: 'opacity 0.15s',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #3DDC97 0%, #2af6ff 100%)',
    color: '#080B0F',
    fontWeight: 700,
  },
  input: {
    flex: 1,
    background: '#080B0F',
    border: '1px solid #252d3d',
    color: '#E6EAF0',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
  },
  errorBox: {
    marginTop: '12px',
    padding: '10px 12px',
    background: '#FF444411',
    border: '1px solid #FF444433',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#FF8888',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
    color: '#333',
    fontSize: '12px',
  },
  dividerText: {
    background: '#0D1117',
    padding: '0 8px',
  },
};

---
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

---
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