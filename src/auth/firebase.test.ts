import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => {
  const user = { uid: 'alice', email: 'alice@example.com', displayName: 'Alice', emailVerified: false, providerData: [{ providerId: 'password' }], getIdToken: vi.fn().mockResolvedValue('token') };
  return { user, auth: { currentUser: user as typeof user | null }, init: vi.fn(), getApps: vi.fn(() => []), persistence: vi.fn().mockResolvedValue(undefined), login: vi.fn().mockResolvedValue(undefined), create: vi.fn().mockResolvedValue({ user }), popup: vi.fn().mockResolvedValue({ user }), link: vi.fn().mockResolvedValue({ user }), logout: vi.fn().mockResolvedValue(undefined), reset: vi.fn().mockResolvedValue(undefined), verify: vi.fn().mockResolvedValue(undefined), reload: vi.fn().mockResolvedValue(undefined), profile: vi.fn().mockResolvedValue(undefined), policy: vi.fn().mockResolvedValue({ isValid: true }), subscribe: vi.fn(), stop: vi.fn(), params: vi.fn() };
});
vi.mock('firebase/app', () => ({ initializeApp: mock.init, getApp: vi.fn(), getApps: mock.getApps }));
vi.mock('firebase/auth', () => ({
  getAuth: () => mock.auth, browserLocalPersistence: 'local', browserSessionPersistence: 'session',
  GoogleAuthProvider: class { setCustomParameters = mock.params; },
  setPersistence: mock.persistence, signInWithEmailAndPassword: mock.login, createUserWithEmailAndPassword: mock.create,
  signInWithPopup: mock.popup, linkWithPopup: mock.link, signOut: mock.logout, sendPasswordResetEmail: mock.reset,
  sendEmailVerification: mock.verify, reload: mock.reload, updateProfile: mock.profile, validatePassword: mock.policy, onIdTokenChanged: mock.subscribe,
}));
import { createFirebaseGateway, missingFirebaseConfig } from './firebase';
const config = { VITE_FIREBASE_API_KEY: 'client-key', VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'example', VITE_FIREBASE_APP_ID: 'web-app' };
describe('Firebase authentication gateway', () => {
  beforeEach(() => { vi.clearAllMocks(); mock.auth.currentUser = mock.user; mock.policy.mockResolvedValue({ isValid: true }); mock.reset.mockResolvedValue(undefined); mock.reload.mockResolvedValue(undefined); });
  it('does not initialize Firebase or invent a user without configuration', () => {
    expect(missingFirebaseConfig({})).toHaveLength(4);
    expect(createFirebaseGateway({ ...config, VITE_FIREBASE_API_KEY: '  ' })).toBeNull();
    expect(mock.init).not.toHaveBeenCalled();
  });
  it('uses session persistence by default and forwards passwords unchanged', async () => {
    const gateway = createFirebaseGateway(config)!;
    await gateway.login(' alice@example.com ', ' secret ', false);
    expect(mock.persistence).toHaveBeenCalledWith(mock.auth, 'session');
    expect(mock.login).toHaveBeenCalledWith(mock.auth, 'alice@example.com', ' secret ');
    expect(mock.persistence.mock.invocationCallOrder[0]).toBeLessThan(mock.login.mock.invocationCallOrder[0]);
  });
  it('validates the Firebase password policy before account creation and sends verification', async () => {
    const gateway = createFirebaseGateway(config)!;
    mock.policy.mockResolvedValueOnce({ isValid: false });
    await expect(gateway.register('Alice', 'alice@example.com', 'weak', false)).rejects.toEqual({ code: 'auth/password-does-not-meet-requirements' });
    expect(mock.create).not.toHaveBeenCalled();
    await gateway.register(' Alice ', ' alice@example.com ', 'secure123', true);
    expect(mock.persistence).toHaveBeenCalledWith(mock.auth, 'local');
    expect(mock.profile).toHaveBeenCalledWith(mock.user, { displayName: 'Alice' });
    expect(mock.verify).toHaveBeenCalledWith(mock.user);
  });
  it('uses Firebase Google OAuth and only links to an authenticated account', async () => {
    const gateway = createFirebaseGateway(config)!;
    await gateway.google(false);
    expect(mock.popup).toHaveBeenCalled(); expect(mock.params).toHaveBeenCalledWith({ prompt: 'select_account' });
    await gateway.linkGoogle(); expect(mock.link.mock.calls[0][0]).toBe(mock.user);
    mock.auth.currentUser = null;
    await expect(gateway.linkGoogle()).rejects.toThrow('No authenticated user');
  });
  it('refreshes verification and refuses to restore an obsolete identity', async () => {
    const gateway = createFirebaseGateway(config)!;
    await gateway.refreshUser(); expect(mock.user.getIdToken).toHaveBeenCalledWith(true);
    mock.reload.mockImplementationOnce(async () => { mock.auth.currentUser = null; });
    expect(await gateway.refreshUser()).toBeNull();
  });
  it('normalizes missing-account reset responses while propagating connection failures', async () => {
    const gateway = createFirebaseGateway(config)!;
    mock.reset.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    await expect(gateway.resetPassword('unknown@example.com')).resolves.toBeUndefined();
    mock.reset.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    await expect(gateway.resetPassword('alice@example.com')).rejects.toEqual({ code: 'auth/network-request-failed' });
  });
  it('uses Firebase sign-out and returns the observer cleanup function', async () => {
    const gateway = createFirebaseGateway(config)!;
    mock.subscribe.mockReturnValueOnce(mock.stop);
    const listener = vi.fn();
    const cleanup = gateway.subscribe(listener, vi.fn());
    mock.subscribe.mock.calls[0][1](mock.user);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ uid: 'alice', emailVerified: false, providers: ['password'] }));
    cleanup(); expect(mock.stop).toHaveBeenCalled();
    await gateway.logout(); expect(mock.logout).toHaveBeenCalledWith(mock.auth);
  });
});
