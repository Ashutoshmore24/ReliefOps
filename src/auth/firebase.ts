import { initializeApp, getApp, getApps } from 'firebase/app';
import { browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, linkWithPopup, onIdTokenChanged, reload, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, validatePassword, type User } from 'firebase/auth';
import type { AuthUser } from './policy';

export interface AuthGateway {
  subscribe(next: (user: AuthUser | null) => void, error: () => void): () => void;
  login(email: string, password: string, remember: boolean): Promise<void>;
  register(name: string, email: string, password: string, remember: boolean): Promise<void>;
  google(remember: boolean): Promise<void>;
  logout(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  verifyEmail(): Promise<void>;
  refreshUser(): Promise<AuthUser | null>;
  linkGoogle(): Promise<AuthUser>;
}
export const requiredConfig = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'] as const;
export function missingFirebaseConfig(env: Record<string, string | undefined>): string[] {
  return requiredConfig.filter(key => !env[key]?.trim());
}
const snapshot = (user: User): AuthUser => ({ uid: user.uid, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified, providers: user.providerData.map(p => p.providerId) });
export function createFirebaseGateway(env: Record<string, string | undefined>): AuthGateway | null {
  if (missingFirebaseConfig(env).length) return null;
  const config = { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID };
  const name = 'reliefops-auth';
  const app = getApps().some(app => app.name === name) ? getApp(name) : initializeApp(config, name);
  const auth = getAuth(app);
  const provider = () => { const google = new GoogleAuthProvider(); google.setCustomParameters({ prompt: 'select_account' }); return google; };
  const persistence = (remember: boolean) => setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const current = () => { if (!auth.currentUser) throw new Error('No authenticated user'); return auth.currentUser; };
  return {
    subscribe: (next, error) => onIdTokenChanged(auth, user => next(user ? snapshot(user) : null), error),
    login: async (email, password, remember) => { await persistence(remember); await signInWithEmailAndPassword(auth, email.trim(), password); },
    register: async (name, email, password, remember) => {
      const policy = await validatePassword(auth, password);
      if (!policy.isValid) throw { code: 'auth/password-does-not-meet-requirements' };
      await persistence(remember);
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await sendEmailVerification(credential.user);
    },
    google: async remember => { await persistence(remember); await signInWithPopup(auth, provider()); },
    logout: () => signOut(auth),
    resetPassword: async email => {
      try { await sendPasswordResetEmail(auth, email.trim()); }
      catch (error) {
        // Keep the reset response independent of account existence.
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/user-not-found') return;
        throw error;
      }
    },
    verifyEmail: () => sendEmailVerification(current()),
    refreshUser: async () => {
      const user = auth.currentUser;
      if (!user) return null;
      await reload(user); await user.getIdToken(true);
      return auth.currentUser?.uid === user.uid ? snapshot(user) : null;
    },
    linkGoogle: async () => { const result = await linkWithPopup(current(), provider()); await result.user.getIdToken(true); return snapshot(result.user); },
  };
}
