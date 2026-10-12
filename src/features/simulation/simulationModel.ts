import type { LucideIcon } from 'lucide-react';
import { Apple, BatteryCharging, Boxes, Droplets, HeartPulse, Radio, Shield, Tent, Utensils, Zap } from 'lucide-react';
import type { Execution, Kit } from '../../algorithm/solver';
import { units, type Mission, type Supply } from '../../domain/mission';

export type SimulationMode = 'simulation' | 'comparison';
export type SimulationStrategy = 'optimal' | 'greedy';
export type ItemPackStatus = 'pending' | 'packing' | 'packed' | 'excluded';

export interface CategoryVisual {
  label: string;
  icon: LucideIcon;
  accent: string;
}

export function getCategoryVisual(category: string, name: string): CategoryVisual {
  const norm = `${category} ${name}`.toLowerCase();
  if (norm.includes('water') || norm.includes('hydrat') || norm.includes('drink') || norm.includes('fluid')) {
    return { label: 'Hydration', icon: Droplets, accent: '#58b6e6' };
  }
  if (norm.includes('med') || norm.includes('trauma') || norm.includes('first-aid') || norm.includes('health') || norm.includes('pharma') || norm.includes('doctor')) {
    return { label: 'Medical', icon: HeartPulse, accent: '#e86161' };
  }
  if (norm.includes('food') || norm.includes('ration') || norm.includes('nutri') || norm.includes('meal') || norm.includes('snack') || norm.includes('pack')) {
    return { label: 'Nutrition', icon: norm.includes('pack') ? Utensils : Apple, accent: '#e5a359' };
  }
  if (norm.includes('shelter') || norm.includes('tent') || norm.includes('tarp')) {
    return { label: 'Shelter', icon: Tent, accent: '#52b788' };
  }
  if (norm.includes('blanket') || norm.includes('thermal') || norm.includes('warmth') || norm.includes('protect')) {
    return { label: 'Protection', icon: Shield, accent: '#709ae8' };
  }
  if (norm.includes('radio') || norm.includes('comm') || norm.includes('sat') || norm.includes('signal') || norm.includes('beacon')) {
    return { label: 'Communication', icon: Radio, accent: '#f49342' };
  }
  if (norm.includes('power') || norm.includes('battery') || norm.includes('generat') || norm.includes('solar') || norm.includes('electr')) {
    return { label: 'Power', icon: BatteryCharging, accent: '#e5c158' };
  }
  if (norm.includes('light') || norm.includes('torch') || norm.includes('flash')) {
    return { label: 'Lighting', icon: Zap, accent: '#edd561' };
  }
  return { label: category || 'General Supply', icon: Boxes, accent: '#8fa5bc' };
}

export interface SimulationStepMetrics {
  packedWeight: number;
  remainingCapacity: number;
  utilization: number;
  packedPriority: number;
  packedCount: number;
  currentItem: Supply | null;
  status: 'idle' | 'packing' | 'complete';
}

export function computeStepMetrics(
  capacity: number,
  allSelected: Supply[],
  stepIndex: number,
  status: 'idle' | 'packing' | 'complete',
): SimulationStepMetrics {
  const activeItems = status === 'idle' ? [] : status === 'complete' ? allSelected : allSelected.slice(0, stepIndex + 1);
  const currentItem = status === 'packing' && stepIndex >= 0 && stepIndex < allSelected.length ? allSelected[stepIndex] : null;

  const capacityUnits = units(capacity);
  const totalWeightUnits = activeItems.reduce((acc, item) => acc + units(item.weight), 0);
  const packedWeight = totalWeightUnits / 100;
  const remainingCapacity = Math.max(0, (capacityUnits - totalWeightUnits) / 100);
  const utilization = capacityUnits > 0 ? Math.min(100, (totalWeightUnits / capacityUnits) * 100) : 0;
  const packedPriority = activeItems.reduce((acc, item) => acc + item.priority, 0);

  return {
    packedWeight,
    remainingCapacity,
    utilization,
    packedPriority,
    packedCount: activeItems.length,
    currentItem,
    status,
  };
}

export interface KitComparisonDiff {
  strategy: SimulationStrategy;
  kit: Kit;
  supplies: Supply[];
  inBoth: Supply[];
  onlyInStrategy: Supply[];
  onlyInOpposite: Supply[];
  priorityDiff: number;
  percentageDiff: number | null;
  explanation: string;
  equal: boolean;
}

export function computeKitComparison(
  execution: Execution,
  mission: Mission,
  strategy: SimulationStrategy,
): KitComparisonDiff {
  const currentKit = strategy === 'optimal' ? execution.result : execution.greedy;
  const oppositeKit = strategy === 'optimal' ? execution.greedy : execution.result;

  const currentIds = new Set(currentKit.selectedIds);
  const oppositeIds = new Set(oppositeKit.selectedIds);

  const supplies = mission.supplies.filter(item => currentIds.has(item.id));
  const inBoth = mission.supplies.filter(item => currentIds.has(item.id) && oppositeIds.has(item.id));
  const onlyInStrategy = mission.supplies.filter(item => currentIds.has(item.id) && !oppositeIds.has(item.id));
  const onlyInOpposite = mission.supplies.filter(item => !currentIds.has(item.id) && oppositeIds.has(item.id));

  const priorityDiff = execution.result.priority - execution.greedy.priority;
  const percentageDiff = execution.greedy.priority > 0 ? (priorityDiff / execution.greedy.priority) * 100 : null;
  const equal = priorityDiff === 0;

  let explanation = '';
  if (equal) {
    explanation = execution.optimal
      ? `Both strategies achieved the exact same priority (${execution.result.priority} pts). Greedy found the proven optimum for this mission.`
      : `Both strategies share the same priority (${execution.result.priority} pts). Optimality is not yet proven for this budget.`;
  } else if (priorityDiff > 0) {
    const optOnlyNames = onlyInStrategy.map(s => s.name).join(', ') || 'its combination';
    const greedyOnlyNames = onlyInOpposite.map(s => s.name).join(', ') || 'its pick';
    if (strategy === 'optimal') {
      explanation = `The optimal kit achieves +${priorityDiff} more priority points (${execution.result.priority} vs ${execution.greedy.priority} pts). While greedy prioritized ${greedyOnlyNames} based purely on ratio, it blocked packing ${optOnlyNames}, which yielded higher total impact.`;
    } else {
      explanation = `Ratio-greedy scored ${execution.greedy.priority} pts, trailing the optimal solution by ${priorityDiff} pts. Greedily taking items with the highest point-to-weight ratio left awkward remaining space that prevented higher-value combinations.`;
    }
  } else {
    explanation = `The search was stopped before completion (${execution.status}). The best-known kit currently trails greedy by ${Math.abs(priorityDiff)} points.`;
  }

  return {
    strategy,
    kit: currentKit,
    supplies,
    inBoth,
    onlyInStrategy,
    onlyInOpposite,
    priorityDiff,
    percentageDiff,
    explanation,
    equal,
  };
}
