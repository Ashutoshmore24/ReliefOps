import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createFirebaseGateway, type AuthGateway } from './firebase';
import { canManageSavedMissions, type AuthStatus, type AuthUser } from './policy';

interface AuthState { status: AuthStatus; user: AuthUser | null; gateway: AuthGateway | null; access: boolean; refresh: () => Promise<boolean>; linkGoogle: () => Promise<void> }
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children, gateway: supplied }: { children: ReactNode; gateway?: AuthGateway | null }) {
  const [initialized] = useState(() => {
    try { return { gateway: supplied === undefined ? createFirebaseGateway(import.meta.env) : supplied, failed: false }; }
    catch { return { gateway: null, failed: true }; }
  });
  const gateway = initialized.gateway;
  const [status, setStatus] = useState<AuthStatus>(gateway ? 'loading' : initialized.failed ? 'error' : 'unconfigured');
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    if (!gateway) return;
    let live = true;
    const stop = gateway.subscribe(next => { if (live) { setUser(next); setStatus('ready'); } }, () => { if (live) { setUser(null); setStatus('error'); } });
    return () => { live = false; stop(); };
  }, [gateway]);
  const refresh = async () => {
    if (!gateway) return false;
    const next = await gateway.refreshUser();
    // Firebase's observer owns identity changes; a verification refresh must
    // not resurrect a user who signed out in another tab while it was pending.
    setUser(previous => previous?.uid === next?.uid ? next : previous);
    return next?.emailVerified ?? false;
  };
  const linkGoogle = async () => {
    if (!gateway) return;
    const next = await gateway.linkGoogle();
    setUser(previous => previous?.uid === next.uid ? next : previous);
  };
  return <AuthContext.Provider value={{ status, user, gateway, access: canManageSavedMissions(status, user), refresh, linkGoogle }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requires AuthProvider');
  return context;
}
