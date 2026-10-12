import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { solve } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
import {
  computeKitComparison,
  computeStepMetrics,
  getCategoryVisual,
} from './simulationModel';
import { EmergencyKitVisual } from './EmergencyKitVisual';
import { LiveKitSimulation } from './LiveKitSimulation';

const floodMission = presets['Flood relief'];

describe('simulation model & category visuals', () => {
  it('maps categories and item keywords to meaningful icons and accents', () => {
    const water = getCategoryVisual('Hydration', 'Drinking water');
    expect(water.label).toBe('Hydration');
    expect(water.accent).toBe('#58b6e6');

    const med = getCategoryVisual('Medical', 'Trauma kit');
    expect(med.label).toBe('Medical');
    expect(med.accent).toBe('#e86161');

    const food = getCategoryVisual('Nutrition', 'Food packs');
    expect(food.label).toBe('Nutrition');

    const radio = getCategoryVisual('Communication', 'Radio');
    expect(radio.label).toBe('Communication');
  });

  it('computes step metrics incrementally with exact decimal precision', () => {
    const selected = [
      { id: 'item1', name: 'Water', category: 'Hydration', weight: 6, priority: 30 },
      { id: 'item2', name: 'Food', category: 'Nutrition', weight: 5.5, priority: 25 },
    ];

    // Idle state
    const idle = computeStepMetrics(15, selected, -1, 'idle');
    expect(idle.packedWeight).toBe(0);
    expect(idle.remainingCapacity).toBe(15);
    expect(idle.packedPriority).toBe(0);
    expect(idle.packedCount).toBe(0);

    // Step 0: only item 1
    const step0 = computeStepMetrics(15, selected, 0, 'packing');
    expect(step0.packedWeight).toBe(6);
    expect(step0.remainingCapacity).toBe(9);
    expect(step0.packedPriority).toBe(30);
    expect(step0.packedCount).toBe(1);
    expect(step0.currentItem?.id).toBe('item1');

    // Complete: both items
    const complete = computeStepMetrics(15, selected, 1, 'complete');
    expect(complete.packedWeight).toBe(11.5);
    expect(complete.remainingCapacity).toBe(3.5);
    expect(complete.packedPriority).toBe(55);
    expect(complete.packedCount).toBe(2);
    expect(complete.utilization).toBeCloseTo((11.5 / 15) * 100);
  });

  it('handles zero carrying capacity safely without NaN or infinite utilization', () => {
    const metrics = computeStepMetrics(0, [], -1, 'idle');
    expect(metrics.utilization).toBe(0);
    expect(metrics.remainingCapacity).toBe(0);
    expect(metrics.packedWeight).toBe(0);
  });
});

describe('strategy comparison logic', () => {
  it('correctly contrasts Optimal vs Greedy on Flood Relief', () => {
    const execution = solve(floodMission);
    const comparison = computeKitComparison(execution, floodMission, 'optimal');

    expect(comparison.equal).toBe(false);
    expect(comparison.priorityDiff).toBe(10);
    expect(comparison.percentageDiff).toBe(20);
    expect(comparison.supplies.map(s => s.id)).toEqual(['medical', 'food']);
    expect(comparison.inBoth.map(s => s.id)).toEqual(['food']);
    expect(comparison.onlyInStrategy.map(s => s.id)).toEqual(['medical']);
    expect(comparison.onlyInOpposite.map(s => s.id)).toEqual(['water']);
    expect(comparison.explanation).toContain('optimal kit achieves +10 more priority points');
    expect(comparison.explanation).toContain('Drinking water');
  });

  it('identifies identical results when greedy matches optimal', () => {
    const medMission = presets['Medical emergency'];
    const execution = solve(medMission);
    const comparison = computeKitComparison(execution, medMission, 'optimal');

    expect(comparison.equal).toBe(true);
    expect(comparison.priorityDiff).toBe(0);
    expect(comparison.explanation).toContain('exact same priority');
  });
});

describe('simulation component rendering', () => {
  it('renders EmergencyKitVisual with empty state and packed state', () => {
    const emptyMetrics = computeStepMetrics(15, [], -1, 'idle');
    const emptyHtml = renderToStaticMarkup(
      <EmergencyKitVisual capacity={15} packedSupplies={[]} metrics={emptyMetrics} optimal={true} />
    );
    expect(emptyHtml).toContain('AWAITING PAYLOAD');
    expect(emptyHtml).toContain('<strong>0</strong> items packed');

    const packedMetrics = computeStepMetrics(15, floodMission.supplies, 1, 'complete');
    const packedHtml = renderToStaticMarkup(
      <EmergencyKitVisual capacity={15} packedSupplies={floodMission.supplies} metrics={packedMetrics} optimal={true} />
    );
    expect(packedHtml).toContain('Drinking water');
    expect(packedHtml).toContain('Medical kit');
    expect(packedHtml).toContain('Payload Utilization');
  });

  it('renders full LiveKitSimulation with 3-column layout and controls', () => {
    const execution = solve(floodMission);
    const html = renderToStaticMarkup(
      <LiveKitSimulation execution={execution} mission={floodMission} />
    );

    // Header & buttons
    expect(html).toContain('Emergency Packing Station');
    expect(html).toContain('Visualize Final Kit');
    expect(html).toContain('Compare Kits');
    expect(html).toContain('Speed');

    // Column A: Supply inventory
    expect(html).toContain('Available Supplies');
    expect(html).toContain('Drinking water');
    expect(html).toContain('Medical kit');
    expect(html).toContain('Food packs');

    // Column B: Central Packing Station
    expect(html).toContain('Central Packing Station');
    expect(html).toContain('DISASTER RELIEF PAYLOAD BAY');

    // Column C: Live Payload Metrics
    expect(html).toContain('Live Payload Metrics');
    expect(html).toContain('Packed Weight');
    expect(html).toContain('Priority Impact');
    expect(html).toContain('Capacity Utilization');
    expect(html).toContain('Proven Optimal Solution');
  });

  it('renders correctly with duplicate supply names without collisions', () => {
    const dupMission = {
      capacity: 10,
      supplies: [
        { id: 'water-alpha', name: 'Water', category: 'Hydration', weight: 4, priority: 20 },
        { id: 'water-beta', name: 'Water', category: 'Hydration', weight: 5, priority: 25 },
      ],
    };
    const execution = solve(dupMission);
    const html = renderToStaticMarkup(
      <LiveKitSimulation execution={execution} mission={dupMission} />
    );

    expect(html).toContain('#1');
    expect(html).toContain('#2');
    expect(html).toContain('Water');
  });
});
