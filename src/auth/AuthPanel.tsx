import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, LogOut, Mail, ShieldCheck, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { authError, validateRegistration } from './policy';

function GoogleMark() {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.3 2.9-7.4Z"/><path fill="#34a853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5a6.2 6.2 0 0 1-9.2-3.2H2.8v2.6A10 10 0 0 0 12 22Z"/><path fill="#fbbc05" d="M6.2 13.9a6 6 0 0 1 0-3.8V7.5H2.8a10 10 0 0 0 0 9l3.4-2.6Z"/><path fill="#ea4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9.2 5.5l3.4 2.6A6 6 0 0 1 12 6Z"/></svg>;
}
function VerificationPanel() {
  const { user, gateway, refresh } = useAuth();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const run = async (action: 'refresh' | 'send' | 'logout') => {
    if (!gateway || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'refresh') { if (!await refresh()) setNotice('Your email is not verified yet. Open the link in your email, then check again.'); }
      if (action === 'send') { await gateway.verifyEmail(); setCooldown(60); setNotice('Verification email sent. Check your inbox and spam folder.'); }
      if (action === 'logout') await gateway.logout();
    } catch (error) { setError(authError(error)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className="auth-content"><div className="auth-symbol"><Mail size={27}/></div><p className="eyebrow">ONE MORE STEP</p><h2>Verify your email</h2><p>Open the verification link for <strong>{user?.email}</strong> to save and manage your missions. Public demos remain available. If you have not received a link, send one below.</p>{notice && <p className="auth-notice" role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}<button className="primary auth-wide" disabled={busy} onClick={() => void run('refresh')}>{busy ? 'Please wait…' : 'I have verified my email'}</button><button className="auth-wide" disabled={busy || cooldown > 0} onClick={() => void run('send')}>{cooldown ? `Send again in ${cooldown}s` : 'Send verification email'}</button><button className="auth-link" disabled={busy} onClick={() => void run('logout')}>Use a different account</button></div>;
}
export function AuthPanel() {
  const { status, user, gateway } = useAuth();
  const available = status === 'ready' && !!gateway;
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [remember, setRemember] = useState(false), [visible, setVisible] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const pending = useRef(false);
  const switchMode = (next: typeof mode) => { setMode(next); setError(''); setNotice(''); setPassword(''); setConfirmation(''); setVisible(false); };
  const act = async (google = false) => {
    if (!gateway || pending.current || status !== 'ready') return;
    setError(''); setNotice('');
    if (!google) {
      if (mode === 'register') { const validation = validateRegistration(name, email, password, confirmation); if (validation) { setError(validation); return; } }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return; }
    }
    pending.current = true; setBusy(true);
    try {
      if (google) await gateway.google(remember);
      else if (mode === 'login') await gateway.login(email, password, remember);
      else if (mode === 'register') await gateway.register(name, email, password, remember);
      else { await gateway.resetPassword(email); setNotice('If an eligible account exists, a password reset email has been sent. Check your inbox and spam folder.'); }
      setPassword(''); setConfirmation('');
    } catch (error) { setError(authError(error)); setPassword(''); setConfirmation(''); }
    finally { pending.current = false; setBusy(false); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void act(); };
  if (status === 'loading') return <div className="auth-content" role="status">Checking your session…</div>;
  if (status === 'error') return <div className="auth-content"><div className="auth-symbol"><LockKeyhole size={27}/></div><h2>Sign-in is unavailable</h2><p>The authentication service could not initialize. Refresh the page or contact the project owner.</p></div>;
  if (user && !user.emailVerified) return <VerificationPanel/>;
  if (user) return <div className="auth-content" role="status"><ShieldCheck size={28}/><h2>You are signed in</h2><p>Your verified account can save and manage your missions.</p></div>;
  return <div className="auth-content"><div className="auth-symbol"><ShieldCheck size={27}/></div><p className="eyebrow">RELIEFOPS / YOUR WORKSPACE</p><h2>{mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h2><p className="muted">{mode === 'reset' ? 'Enter your email to request a password reset link.' : 'Sign in to save your missions and return to them later. Demos are public.'}</p>
    {!available && <p className="auth-notice" role="status">Sign-in is unavailable until the project owner connects Firebase Authentication. This form is a preview; account actions are disabled.</p>}
    {mode !== 'reset' && <><button className="auth-google auth-wide" disabled={busy || !available} onClick={() => void act(true)}><GoogleMark/> Continue with Google</button><div className="auth-divider"><span>OR</span></div></>}
    <form onSubmit={submit} aria-label={mode === 'register' ? 'Create account' : mode === 'reset' ? 'Reset password' : 'Email sign-in'}>
      {mode === 'register' && <label className="auth-field">Name<input autoComplete="name" name="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={busy}/></label>}
      <label className="auth-field">Email address<input type="email" name="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/></label>
      {mode !== 'reset' && <><label className="auth-field">Password<span className="auth-password"><input name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={mode === 'register' ? 128 : undefined} value={password} onChange={e => setPassword(e.target.value)} disabled={busy}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible(!visible)} disabled={busy}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>{mode === 'register' && <><p className="auth-hint">Use at least 8 characters. Your Firebase project may require a stronger password.</p><label className="auth-field">Confirm password<input name="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy}/></label></>}<label className="auth-remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={busy}/> Keep me signed in on this device</label></>}
      {notice && <p className="auth-notice" role="status">{notice}</p>}{error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="primary auth-wide" disabled={busy || !available}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>
    </form>
    {mode === 'login' && <button className="auth-link" disabled={busy} onClick={() => switchMode('reset')}>Forgot password?</button>}
    <p className="auth-switch">{mode === 'login' ? 'New to ReliefOps?' : mode === 'register' ? 'Already have an account?' : 'Remember your password?'} <button className="auth-link" disabled={busy} onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
  </div>;
}
export function AuthDialog({ open, close }: { open: boolean; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { access } = useAuth();
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !access && !node.open) node.showModal();
    if ((!open || access) && node.open) node.close();
  }, [open, access]);
  return <dialog ref={dialog} className="auth-dialog" aria-label="ReliefOps account" onCancel={close} onClose={close}><button className="auth-close" aria-label="Close sign-in" onClick={close}><X size={18}/></button>{open && <AuthPanel/>}</dialog>;
}
export function AccountMenu() {
  const { user, gateway, linkGoogle } = useAuth();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false);
  if (!user) return null;
  const run = async (link: boolean) => {
    if (!gateway || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { if (link) await linkGoogle(); else await gateway.logout(); }
    catch (error) { setError(authError(error)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <details className="account-menu"><summary><ShieldCheck size={15}/><span>{user.displayName || 'Account'}</span></summary><div><strong>{user.displayName || 'Your account'}</strong><p>{user.email}</p><small>{user.emailVerified ? 'Verified email' : 'Verification required'}</small>{!user.providers.includes('google.com') && <button disabled={busy} onClick={() => void run(true)}><GoogleMark/> Link Google account</button>}<button disabled={busy} onClick={() => void run(false)}><LogOut size={15}/> {busy ? 'Please wait…' : 'Sign out'}</button>{error && <p className="auth-error" role="alert">{error}</p>}</div></details>;
}
