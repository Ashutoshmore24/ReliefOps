import { presets, validateMission, type Mission, type Supply } from './mission';
export interface DraftSupply { id: string; name: string; category: string; weight: string; priority: string }
export interface Draft { name: string; capacity: string; supplies: DraftSupply[] }
export type Edit = { type: 'mission'; field: 'name' | 'capacity'; value: string } | { type: 'item'; id: string; field: Exclude<keyof DraftSupply, 'id'>; value: string } | { type: 'add'; id: string } | { type: 'duplicate'; id: string; newId: string } | { type: 'delete'; id: string } | { type: 'move'; id: string; direction: -1 | 1 };
export function presetDraft(name: string): Draft {
  const mission = presets[name];
  return { name, capacity: String(mission.capacity), supplies: mission.supplies.map(item => ({ ...item, weight: String(item.weight), priority: String(item.priority) })) };
}
export function editDraft(draft: Draft, action: Edit): Draft {
  if (action.type === 'mission') return { ...draft, [action.field]: action.value };
  let supplies = [...draft.supplies];
  const index = 'id' in action ? supplies.findIndex(item => item.id === action.id) : -1;
  if (action.type === 'add') supplies.push({ id: action.id, name: '', category: 'General', weight: '', priority: '' });
  if (index >= 0 && action.type === 'item') supplies[index] = { ...supplies[index], [action.field]: action.value };
  if (index >= 0 && action.type === 'duplicate') supplies.splice(index + 1, 0, { ...supplies[index], id: action.newId });
  if (action.type === 'delete') supplies = supplies.filter(item => item.id !== action.id);
  if (index >= 0 && action.type === 'move') {
    const target = index + action.direction;
    if (target >= 0 && target < supplies.length) [supplies[index], supplies[target]] = [supplies[target], supplies[index]];
  }
  return { ...draft, supplies };
}
export function validateDraft(draft: Draft): { mission: Mission; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'Enter a mission name.';
  const numeric = (text: string) => text.trim() ? Number(text) : NaN;
  const mission: Mission = { capacity: numeric(draft.capacity), supplies: draft.supplies.map(item => ({ ...item, weight: numeric(item.weight), priority: numeric(item.priority) })) };
  const capacityErrors = validateMission({ capacity: mission.capacity, supplies: [] });
  if (capacityErrors.length) errors.capacity = capacityErrors[0];
  if (mission.supplies.length > 100) errors.inventory = 'Use at most 100 supplies.';
  mission.supplies.forEach((item: Supply) => {
    if (!item.name.trim()) errors[`${item.id}.name`] = 'Enter a supply name.';
    if (!item.category.trim()) errors[`${item.id}.category`] = 'Enter a category.';
    const messages = validateMission({ capacity: 0, supplies: [item] });
    const weight = messages.find(message => message.includes('weight must'));
    const priority = messages.find(message => message.includes('priority must'));
    if (weight) errors[`${item.id}.weight`] = weight.replace('Supply 1: ', '');
    if (priority) errors[`${item.id}.priority`] = priority.replace('Supply 1: ', '');
  });
  const domainErrors = validateMission(mission);
  if (domainErrors.some(message => message.includes('IDs'))) errors.inventory = 'Supply identities must be unique.';
  return { mission, errors };
}
