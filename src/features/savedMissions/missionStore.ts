import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { validateDraft, type Draft } from '../../domain/editor';
import { validateMission, type Mission } from '../../domain/mission';

export interface SavedMission { id: string; name: string; mission: Mission; pending: boolean }
export function missionPayload(draft: Draft) {
  const { mission, errors } = validateDraft(draft);
  if (Object.keys(errors).length) throw new Error('Fix the mission fields before saving.');
  if (draft.name.trim().length > 120) throw new Error('Use a mission name with up to 120 characters.');
  // Whitelist fields. Solver output, account data and credentials never enter
  // mission documents. Validation handles weights and arbitrary item IDs.
  return { name: draft.name.trim(), capacity: mission.capacity, supplies: mission.supplies.map(item => ({ id: item.id, name: item.name, category: item.category, weight: item.weight, priority: item.priority })) };
}
export function readSavedMission(id: string, data: DocumentData, pending = false): SavedMission | null {
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.length > 120 || typeof data.capacity !== 'number' || !Array.isArray(data.supplies)) return null;
  if (data.supplies.some((s: unknown) => typeof s !== 'object' || s === null || !['id', 'name', 'category'].every(key => key in s && typeof s[key as keyof typeof s] === 'string') || !('weight' in s) || !('priority' in s) || typeof s.weight !== 'number' || typeof s.priority !== 'number')) return null;
  const mission: Mission = { capacity: data.capacity, supplies: data.supplies.map(s => ({ id: s.id, name: s.name, category: s.category, weight: s.weight, priority: s.priority })) };
  if (validateMission(mission).length) return null;
  return { id, name: data.name, mission, pending };
}
export function savedMissionDraft(saved: SavedMission): Draft {
  return { name: saved.name, capacity: String(saved.mission.capacity), supplies: saved.mission.supplies.map(s => ({ ...s, weight: String(s.weight), priority: String(s.priority) })) };
}
export function missionStoreError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return 'Access denied. Verify your email and ask the project owner to publish the supplied Firestore ownership rules.';
  if (code === 'unauthenticated') return 'Sign in again to access saved missions.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'The mission service is unavailable. Check your connection and try again.';
  if (error instanceof Error && ['Fix the mission fields before saving.', 'Use a mission name with up to 120 characters.'].includes(error.message)) return error.message;
  return 'Saved missions could not be accessed. Check Firebase database setup and try again.';
}
export function createMissionStore(uid: string) {
  const app = getApp('reliefops-auth'), auth = getAuth(app), db = getFirestore(app);
  const assertOwner = () => {
    if (!uid || auth.currentUser?.uid !== uid || !auth.currentUser.emailVerified) throw { code: 'unauthenticated' };
  };
  const reference = collection(db, 'users', uid, 'missions');
  return {
    subscribe(next: (items: SavedMission[], omitted: number) => void, error: (error: unknown) => void) {
      assertOwner();
      return onSnapshot(query(reference, orderBy('updatedAt', 'desc'), limit(100)), snapshot => {
        const items = snapshot.docs.map(document => readSavedMission(document.id, document.data(), document.metadata.hasPendingWrites));
        next(items.filter((item): item is SavedMission => item !== null), items.filter(item => item === null).length);
      }, error);
    },
    async save(draft: Draft) {
      assertOwner();
      const payload = missionPayload(draft);
      const saved = await addDoc(reference, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return saved.id;
    },
    async remove(id: string) {
      assertOwner();
      if (!id || id.includes('/')) throw new Error('Invalid mission ID');
      await deleteDoc(doc(reference, id));
    },
  };
}
