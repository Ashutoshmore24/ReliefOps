import { describe, expect, it } from 'vitest';
import { authError, canManageSavedMissions, validateRegistration, type AuthUser } from './policy';
const alice: AuthUser = { uid: 'alice', email: 'alice@example.com', displayName: 'Alice', emailVerified: true, providers: ['password'] };
describe('saved mission access policy', () => {
  it('denies access while session resolution is pending or unavailable', () => {
    for (const state of ['loading', 'error', 'unconfigured'] as const) expect(canManageSavedMissions(state, alice)).toBe(false);
    expect(canManageSavedMissions('ready', null)).toBe(false);
    expect(canManageSavedMissions('ready', { ...alice, uid: '' })).toBe(false);
  });
  it('requires a verified Firebase identity, regardless of sign-in provider', () => {
    expect(canManageSavedMissions('ready', { ...alice, emailVerified: false })).toBe(false);
    expect(canManageSavedMissions('ready', alice)).toBe(true);
    expect(canManageSavedMissions('ready', { ...alice, providers: ['google.com'] })).toBe(true);
    expect(canManageSavedMissions('ready', { ...alice, providers: ['google.com'], emailVerified: false })).toBe(false);
  });
  it('validates names, email, password bounds and confirmation without trimming passwords', () => {
    expect(validateRegistration('Alice', 'alice@example.com', 'secure123', 'secure123')).toBeNull();
    expect(validateRegistration(' ', 'alice@example.com', 'secure123', 'secure123')).toContain('name');
    expect(validateRegistration('Alice', 'alice', 'secure123', 'secure123')).toContain('email');
    expect(validateRegistration('Alice', 'alice@example.com', 'short', 'short')).toContain('8–128');
    expect(validateRegistration('Alice', 'alice@example.com', 'secure123 ', 'secure123')).toContain('match');
    expect(validateRegistration('Alice', 'alice@example.com', 'a'.repeat(129), 'a'.repeat(129))).toContain('8–128');
  });
  it('does not expose account existence or raw Firebase error details', () => {
    const generic = authError({ code: 'auth/invalid-credential' });
    expect(authError({ code: 'auth/user-not-found' })).toBe(generic);
    expect(authError({ code: 'auth/wrong-password' })).toBe(generic);
    expect(authError({ code: 'auth/user-disabled' })).toBe(generic);
    expect(authError(new Error('private internal detail'))).not.toContain('private');
    expect(authError({ code: 'auth/popup-blocked' })).toContain('blocked');
    expect(authError({ code: 'auth/unauthorized-domain' })).toContain('not authorized');
  });
});
