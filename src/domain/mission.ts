export interface Supply { id: string; name: string; category: string; weight: number; priority: number }
export interface Mission { capacity: number; supplies: Supply[] }
export const MAX_UNITS = 1_000_000;
export function units(value: number): number { return Math.round(value * 100); }
function validWeight(value: number, allowZero: boolean): boolean {
  return Number.isFinite(value) && (allowZero ? value >= 0 : value > 0 && units(value) > 0) && units(value) <= MAX_UNITS && Math.abs(value * 100 - units(value)) < 1e-7;
}
export function validateMission(mission: Mission): string[] {
  const errors: string[] = [];
  if (!validWeight(mission.capacity, true)) errors.push('Capacity must be between 0 and 10,000 kg, with at most two decimal places.');
  if (mission.supplies.length > 100) errors.push('Use at most 100 supplies.');
  const ids = new Set<string>();
  mission.supplies.forEach((item, index) => {
    const label = `Supply ${index + 1}`;
    if (!item.id || ids.has(item.id)) errors.push(`${label}: supply IDs must be unique and nonempty.`);
    ids.add(item.id);
    if (!item.name.trim()) errors.push(`${label}: enter a name.`);
    if (!item.category.trim()) errors.push(`${label}: enter a category.`);
    if (!validWeight(item.weight, false)) errors.push(`${label}: weight must be positive, at most 10,000 kg, with at most two decimal places.`);
    if (!Number.isSafeInteger(item.priority) || item.priority < 0 || item.priority > 1_000_000) errors.push(`${label}: priority must be an integer between 0 and 1,000,000.`);
  });
  return errors;
}
export const presets: Record<string, Mission> = {
  'Flood relief': { capacity: 15, supplies: [
    { id: 'water', name: 'Drinking water', category: 'Hydration', weight: 6, priority: 30 },
    { id: 'medical', name: 'Medical kit', category: 'Medical', weight: 10, priority: 40 },
    { id: 'food', name: 'Food packs', category: 'Nutrition', weight: 5, priority: 20 },
  ] },
  'Earthquake response': { capacity: 18, supplies: [
    { id: 'first-aid', name: 'Trauma kit', category: 'Medical', weight: 7, priority: 55 },
    { id: 'shelter', name: 'Shelter kit', category: 'Shelter', weight: 9, priority: 50 },
    { id: 'radio', name: 'Radio', category: 'Communication', weight: 2, priority: 18 },
    { id: 'water', name: 'Water', category: 'Hydration', weight: 5, priority: 32 },
  ] },
  'Medical emergency': { capacity: 10, supplies: [
    { id: 'trauma', name: 'Trauma supplies', category: 'Medical', weight: 6, priority: 60 },
    { id: 'medicines', name: 'Medicines', category: 'Medical', weight: 4, priority: 45 },
    { id: 'blankets', name: 'Thermal blankets', category: 'Shelter', weight: 3, priority: 20 },
  ] },
  'Custom mission': { capacity: 15, supplies: [] },
};
