import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthProvider } from './AuthContext';
import { AuthPanel } from './AuthPanel';
import type { AuthGateway } from './firebase';
describe('authentication initialization UI', () => {
  it('shows a configuration state instead of offering fake sign-in', () => {
    const html = renderToStaticMarkup(<AuthProvider gateway={null}><AuthPanel/></AuthProvider>);
    expect(html).toContain('Sign-in is unavailable');
    expect(html).toContain('account actions are disabled');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('disabled=""');
  });
  it('waits for Firebase to resolve the session before rendering sign-in or protected content', () => {
    const gateway = { subscribe: () => () => {} } as unknown as AuthGateway;
    const html = renderToStaticMarkup(<AuthProvider gateway={gateway}><AuthPanel/></AuthProvider>);
    expect(html).toContain('Checking your session');
    expect(html).not.toContain('You are signed in');
    expect(html).not.toContain('type="password"');
  });
});
