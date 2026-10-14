import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import type { Draft } from '../../domain/editor';
import { createMissionStore, missionStoreError, savedMissionDraft, type SavedMission } from './missionStore';

export default function SavedMissions({ draft, load, signIn }: { draft: Draft; load: (draft: Draft) => void; signIn: () => void }) {
  const { user, access, status } = useAuth();
  const [items, setItems] = useState<SavedMission[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [omitted, setOmitted] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const store = useRef<ReturnType<typeof createMissionStore> | null>(null), live = useRef(false), pending = useRef(false);
  useEffect(() => {
    live.current = true; setItems([]); setError(''); setNotice(''); setLoading(true); setDeleting(null); setOmitted(0);
    let stop: (() => void) | undefined;
    if (access && user) {
      try {
        store.current = createMissionStore(user.uid);
        stop = store.current.subscribe((next, ignored) => { if (live.current) { setItems(next); setOmitted(ignored); setLoading(false); } }, error => { if (live.current) { setItems([]); setError(missionStoreError(error)); setLoading(false); } });
      } catch (error) { setError(missionStoreError(error)); setLoading(false); }
    }
    return () => { live.current = false; stop?.(); store.current = null; };
  }, [access, user?.uid]);
  const save = async () => {
    if (!access || !store.current || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try { await store.current.save(structuredClone(draft)); if (live.current) setNotice('Mission saved to your account.'); }
    catch (error) { if (live.current) setError(missionStoreError(error)); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!access || !store.current || pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try { await store.current.remove(id); if (live.current) { setDeleting(null); setNotice('Saved mission deleted. Your current editor is unchanged.'); } }
    catch (error) { if (live.current) setError(missionStoreError(error)); }
    finally { pending.current = false; if (live.current) setBusy(false); }
  };
  return <section className="panel saved-missions" aria-labelledby="saved-heading"><div className="section-heading"><div><p className="eyebrow">YOUR PRIVATE MISSION LIBRARY</p><h2 id="saved-heading"><FolderOpen size={22}/> My missions</h2></div>{access && <button className="primary" disabled={busy} onClick={() => void save()}><Save size={15}/> {busy ? 'Please wait…' : 'Save current mission'}</button>}</div>
    {!access ? <><p>{status === 'loading' ? 'Checking your session…' : user ? 'Verify your email to save and access your missions.' : 'Sign in to save missions to your account. Optimization, lessons, and the 3D demo are available without signing in.'}</p><button disabled={status === 'loading'} onClick={signIn}>{user ? 'Verify email' : 'Sign in or create account'}</button></> : <>
      <p className="muted">Only your account can access this library. Loading replaces the editor and clears its previous execution; Undo last edit restores the previous inputs. Showing up to 100 recent saved missions.</p>
      {loading && <p role="status">Loading saved missions…</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}
      {!loading && !error && !items.length && <p>No saved missions yet. Prepare a mission, then save it here.</p>}
      {omitted > 0 && <p role="status">{omitted} invalid mission records were omitted. They cannot be loaded into the optimizer.</p>}
      <div className="saved-mission-list">{items.map(item => <article key={item.id}><div><strong>{item.name}</strong><small>{item.mission.capacity} kg capacity · {item.mission.supplies.length} supplies{item.pending ? ' · Waiting for cloud confirmation' : ''}</small></div><button disabled={busy || item.pending} onClick={() => { if (access) { load(savedMissionDraft(item)); setNotice(`Loaded ${item.name}.`); } }}>Load</button>{deleting === item.id ? <div className="saved-delete-confirm"><span>Delete this saved mission?</span><button disabled={busy} onClick={() => void remove(item.id)}>Delete permanently</button><button disabled={busy} onClick={() => setDeleting(null)}>Keep</button></div> : <button disabled={busy || item.pending} aria-label={`Delete saved mission ${item.name}`} onClick={() => setDeleting(item.id)}><Trash2 size={15}/></button>}</article>)}</div>
    </>}
  </section>;
}
