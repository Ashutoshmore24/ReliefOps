export interface AuthUser { uid: string; email: string | null; displayName: string | null; emailVerified: boolean; providers: string[] }
export type AuthStatus = 'loading' | 'ready' | 'unconfigured' | 'error';
export function canManageSavedMissions(status: AuthStatus, user: AuthUser | null): boolean {
  return status === 'ready' && !!user?.uid && user.emailVerified;
}
export function validateRegistration(name: string, email: string, password: string, confirmation: string): string | null {
  if (!name.trim() || name.trim().length > 80) return 'Enter your name, using up to 80 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (password.length < 8 || password.length > 128) return 'Use a password with 8–128 characters.';
  if (password !== confirmation) return 'The passwords do not match.';
  return null;
}
export function authError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': case 'auth/invalid-email': case 'auth/user-disabled':
      return 'Unable to sign in with those credentials. Check your details or reset your password.';
    case 'auth/email-already-in-use': return 'Unable to create this account. Try signing in or resetting your password.';
    case 'auth/weak-password': case 'auth/password-does-not-meet-requirements': return 'Choose a stronger password that meets this project’s password policy.';
    case 'auth/popup-closed-by-user': case 'auth/cancelled-popup-request': return 'Google sign-in was cancelled. You can try again.';
    case 'auth/popup-blocked': return 'Your browser blocked the Google sign-in window. Allow popups for this site and try again.';
    case 'auth/account-exists-with-different-credential': case 'auth/credential-already-in-use':
      return 'Sign in using your existing account method. Google can be linked from your signed-in account.';
    case 'auth/unauthorized-domain': return 'This website domain is not authorized in Firebase. Ask the project owner to add it.';
    case 'auth/operation-not-allowed': return 'This sign-in method is not enabled. Ask the project owner to enable it in Firebase.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait before trying again.';
    case 'auth/network-request-failed': return 'Could not connect. Check your connection and try again.';
    case 'auth/requires-recent-login': return 'Sign out and sign in again before linking an account.';
    default: return 'Authentication could not complete. Please try again.';
  }
}
