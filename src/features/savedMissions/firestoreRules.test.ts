import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, terminate, updateDoc, type Firestore } from 'firebase/firestore';

// Uses only a local demo project. Production configuration is never used here.
const host = process.env.FIRESTORE_EMULATOR_HOST;
describe.skipIf(!host)('Firestore server ownership rules', () => {
  const projectId = 'demo-reliefops';
  const apps: FirebaseApp[] = [], stores: Firestore[] = [];
  let alice: Firestore, bob: Firestore, unverified: Firestore, guest: Firestore;
  const payload = () => ({ name: 'Flood', capacity: 15, supplies: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  beforeAll(async () => {
    const [hostname, port] = host!.split(':');
    const rules = await readFile(new URL('../../../firestore.rules', import.meta.url), 'utf8');
    const response = await fetch(`http://${host}/emulator/v1/projects/${projectId}:securityRules`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } }) });
    if (!response.ok) throw new Error(`Emulator rejected rules: ${await response.text()}`);
    const create = (uid: string | null, verified = true) => {
      const app = initializeApp({ projectId, apiKey: 'emulator-only' }, `rules-${uid ?? 'guest'}-${verified}`); apps.push(app);
      const db = getFirestore(app); stores.push(db);
      connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid, email_verified: verified } } : {});
      return db;
    };
    alice = create('alice'); bob = create('bob'); unverified = create('alice', false); guest = create(null);
    await setDoc(doc(alice, 'users/alice/missions/owned'), payload());
  }, 30000);
  afterAll(async () => { await Promise.all(stores.map(db => terminate(db))); await Promise.all(apps.map(app => deleteApp(app))); });
  it('allows a verified owner to create, read, update and delete their mission', async () => {
    const ref = doc(alice, 'users/alice/missions/own-crud');
    await setDoc(ref, payload());
    expect((await getDoc(ref)).exists()).toBe(true);
    await updateDoc(ref, { name: 'Updated', updatedAt: serverTimestamp() });
    expect((await getDoc(ref)).data()?.name).toBe('Updated');
    await deleteDoc(ref); expect((await getDoc(ref)).exists()).toBe(false);
  });
  it('denies another user every operation against the owner’s path', async () => {
    await expect(getDoc(doc(bob, 'users/alice/missions/owned'))).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(bob, 'users/alice/missions/injected'), payload())).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(doc(bob, 'users/alice/missions/owned'), { name: 'Attack', updatedAt: serverTimestamp() })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(deleteDoc(doc(bob, 'users/alice/missions/owned'))).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('denies guests and unverified identities', async () => {
    for (const db of [guest, unverified]) {
      await expect(getDoc(doc(db, 'users/alice/missions/owned'))).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(setDoc(doc(db, 'users/alice/missions/blocked'), payload())).rejects.toMatchObject({ code: 'permission-denied' });
    }
  });
  it('denies unknown paths, extra fields, forged timestamps and altered creation time', async () => {
    await expect(setDoc(doc(alice, 'missions/public'), payload())).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(alice, 'users/alice/missions/role'), { ...payload(), role: 'admin' })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(setDoc(doc(alice, 'users/alice/missions/forged'), { ...payload(), createdAt: new Date(0) })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(updateDoc(doc(alice, 'users/alice/missions/owned'), { createdAt: new Date(0), updatedAt: serverTimestamp() })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
