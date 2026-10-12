import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FastForward,
  Layers,
  Package,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Sparkles,
  TriangleAlert,
  Truck,
} from 'lucide-react';
import type { Execution } from '../../algorithm/solver';
import type { Mission, Supply } from '../../domain/mission';
import { useReducedMotion } from '../../playback/usePlaybackClock';
import { EmergencyKitVisual } from './EmergencyKitVisual';
import {
  computeKitComparison,
  computeStepMetrics,
  getCategoryVisual,
  type ItemPackStatus,
  type SimulationMode,
  type SimulationStrategy,
} from './simulationModel';

export function LiveKitSimulation({
  execution,
  mission,
  compact = false,
}: {
  execution: Execution;
  mission: Mission;
  compact?: boolean;
}) {
  const [mode, setMode] = useState<SimulationMode>('simulation');
  const [strategy, setStrategy] = useState<SimulationStrategy>('optimal');
  const [status, setStatus] = useState<'idle' | 'packing' | 'complete'>('idle');
  const [stepIndex, setStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const reducedMotion = useReducedMotion();
  const timerRef = useRef<number | null>(null);

  // Invalidate simulation whenever the underlying execution or mission changes
  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMode('simulation');
    setStrategy('optimal');
    setStatus('idle');
    setStepIndex(-1);
    setIsPlaying(false);
  }, [execution, mission]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const activeKit = strategy === 'optimal' ? execution.result : execution.greedy;
  const activeSelectedIds = useMemo(() => new Set(activeKit.selectedIds), [activeKit.selectedIds]);

  const selectedSupplies = useMemo(() => {
    return mission.supplies.filter(item => activeSelectedIds.has(item.id));
  }, [mission.supplies, activeSelectedIds]);

  // Metrics for current simulation step
  const stepMetrics = useMemo(() => {
    return computeStepMetrics(mission.capacity, selectedSupplies, stepIndex, status);
  }, [mission.capacity, selectedSupplies, stepIndex, status]);

  // Comparison metrics between optimal and greedy
  const comparison = useMemo(() => {
    return computeKitComparison(execution, mission, strategy);
  }, [execution, mission, strategy]);

  // Stop current timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Action: Launch / Replay the full packing sequence
  const startSimulation = useCallback(() => {
    clearTimer();
    setMode('simulation');
    if (selectedSupplies.length === 0) {
      setStatus('complete');
      setStepIndex(-1);
      setIsPlaying(false);
      return;
    }
    if (reducedMotion) {
      setStatus('complete');
      setStepIndex(selectedSupplies.length - 1);
      setIsPlaying(false);
      return;
    }
    setStatus('packing');
    setStepIndex(0);
    setIsPlaying(true);
  }, [clearTimer, selectedSupplies.length, reducedMotion]);

  // Action: Skip to final result immediately
  const skipToFinal = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setStatus('complete');
    setStepIndex(selectedSupplies.length - 1);
  }, [clearTimer, selectedSupplies.length]);

  // Action: Reset simulation back to idle state
  const resetSimulation = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setStatus('idle');
    setStepIndex(-1);
  }, [clearTimer]);

  // Step ticker effect
  useEffect(() => {
    if (!isPlaying || status !== 'packing') {
      clearTimer();
      return;
    }

    if (stepIndex >= selectedSupplies.length - 1) {
      // Reached the end of packing
      setStatus('complete');
      setIsPlaying(false);
      return;
    }

    const baseDelay = 850;
    const delay = reducedMotion ? 50 : Math.round(baseDelay / speed);

    timerRef.current = window.setTimeout(() => {
      setStepIndex(prev => prev + 1);
    }, delay);

    return () => {
      clearTimer();
    };
  }, [isPlaying, status, stepIndex, selectedSupplies.length, speed, reducedMotion, clearTimer]);

  // Determine item packing status in simulation mode
  const getItemStatus = (item: Supply): ItemPackStatus => {
    if (!activeSelectedIds.has(item.id)) return 'excluded';
    if (status === 'idle') return 'pending';
    if (status === 'complete') return 'packed';
    const itemIndex = selectedSupplies.findIndex(s => s.id === item.id);
    if (itemIndex < stepIndex) return 'packed';
    if (itemIndex === stepIndex) return 'packing';
    return 'pending';
  };

  const packedItems = status === 'idle' ? [] : status === 'complete' ? selectedSupplies : selectedSupplies.slice(0, stepIndex + 1);

  if (compact) {
    return null;
  }

  return (
    <section className="panel simulation-panel" aria-labelledby="simulation-heading">
      {/* Simulation Section Header */}
      <div className="section-heading simulation-header">
        <div>
          <p className="eyebrow">LIVE RELIEF KIT SIMULATION</p>
          <h2 id="simulation-heading" tabIndex={-1}>
            Emergency Packing Station
          </h2>
        </div>
        <div className="simulation-top-actions">
          <button
            className={`sim-mode-toggle ${mode === 'simulation' ? 'active' : ''}`}
            onClick={() => {
              setMode('simulation');
            }}
          >
            <Truck size={15} /> Packing Simulator
          </button>
          <button
            className={`sim-mode-toggle ${mode === 'comparison' ? 'active' : ''}`}
            onClick={() => {
              clearTimer();
              setIsPlaying(false);
              setMode('comparison');
              setStatus('complete');
            }}
          >
            <Layers size={15} /> Compare Kits
          </button>
        </div>
      </div>

      <p className="muted">
        Watch the emergency response kit assemble in real time using the exact mathematical solution. Every supply
        is taken whole or excluded based on carrying limits.
      </p>

      {/* Primary Action & Playback Toolbar */}
      <div className="simulation-toolbar" role="toolbar" aria-label="Packing simulation controls">
        <button
          className="primary visualize-btn"
          onClick={startSimulation}
          aria-label="Visualize Final Kit packing sequence"
        >
          <Sparkles size={16} /> Visualize Final Kit
        </button>

        {mode === 'simulation' && (
          <div className="sim-controls-group">
            {status === 'packing' && (
              <button
                className="sim-ctrl-btn"
                onClick={() => setIsPlaying(p => !p)}
                aria-label={isPlaying ? 'Pause simulation' : 'Resume simulation'}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                <span>{isPlaying ? 'Pause' : 'Resume'}</span>
              </button>
            )}

            {status === 'complete' && (
              <button className="sim-ctrl-btn" onClick={startSimulation} aria-label="Replay packing animation">
                <RotateCcw size={15} />
                <span>Replay</span>
              </button>
            )}

            {status === 'packing' && (
              <button className="sim-ctrl-btn" onClick={skipToFinal} aria-label="Skip to final result">
                <FastForward size={15} />
                <span>Skip</span>
              </button>
            )}

            {status !== 'idle' && (
              <button className="sim-ctrl-btn" onClick={resetSimulation} aria-label="Reset kit to empty">
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            )}

            <label className="sim-speed-selector">
              <Clock size={13} />
              <span>Speed</span>
              <select
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                aria-label="Simulation speed"
                disabled={reducedMotion}
              >
                <option value={0.5}>0.5×</option>
                <option value={1}>1.0×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </label>

            <span className="sim-progress-indicator" aria-live="polite">
              {status === 'idle'
                ? 'Ready to pack'
                : status === 'packing'
                  ? `Packing ${stepIndex + 1} of ${selectedSupplies.length}`
                  : `All ${selectedSupplies.length} packed`}
            </span>
          </div>
        )}

        {/* Strategy switch when in comparison mode */}
        {mode === 'comparison' && (
          <div className="sim-strategy-switch" role="group" aria-label="Strategy comparison kit view">
            <button
              className={`strategy-btn ${strategy === 'optimal' ? 'active-strategy' : ''}`}
              onClick={() => {
                setStrategy('optimal');
                setStatus('complete');
              }}
            >
              {execution.optimal ? 'Optimal Kit (BnB)' : 'Best-Known Kit'}
            </button>
            <button
              className={`strategy-btn ${strategy === 'greedy' ? 'active-strategy' : ''}`}
              onClick={() => {
                setStrategy('greedy');
                setStatus('complete');
              }}
            >
              Ratio-Greedy Kit
            </button>
          </div>
        )}
      </div>

      {/* Comparison Insight Callout when in comparison mode */}
      {mode === 'comparison' && (
        <div className="comparison-callout" role="region" aria-label="Comparison explanation">
          <div className="comparison-callout-header">
            <strong>
              {comparison.equal
                ? 'Identical Outcome'
                : comparison.priorityDiff > 0
                  ? `Optimal Advantage: +${comparison.priorityDiff} Priority Points${
                      comparison.percentageDiff !== null ? ` (${comparison.percentageDiff.toFixed(1)}% gain)` : ''
                    }`
                  : `Search Stopped: ${Math.abs(comparison.priorityDiff)} Points Below Greedy`}
            </strong>
            <span className="tag">
              Viewing {strategy === 'optimal' ? (execution.optimal ? 'Optimal Kit' : 'Best-Known Kit') : 'Ratio-Greedy Kit'}
            </span>
          </div>
          <p>{comparison.explanation}</p>
        </div>
      )}

      {/* Three-Column Composition (Desktop) / Vertical Stack (Mobile) */}
      <div className="simulation-layout">
        {/* Column A: Supply Inventory */}
        <div className="sim-column inventory-column" role="region" aria-label="Supply inventory">
          <div className="column-title">
            <Package size={15} />
            <h3>Available Supplies</h3>
            <span className="tag">{mission.supplies.length} in inventory</span>
          </div>
          <p className="column-caption">
            {mode === 'comparison'
              ? 'Color badges show how this strategy selected each item compared to the alternative.'
              : 'Items highlight as the optimizer commits each decision to the payload bay.'}
          </p>

          <div className="supply-card-list">
            {mission.supplies.length === 0 ? (
              <p className="empty-inventory-note">No supplies available in this mission.</p>
            ) : (
              mission.supplies.map((item, idx) => {
                const visual = getCategoryVisual(item.category, item.name);
                const Icon = visual.icon;
                const packStatus = getItemStatus(item);

                // In comparison mode, show relation to both kits
                let compBadge = '';
                let compClass = '';
                if (mode === 'comparison') {
                  const inOpt = execution.result.selectedIds.includes(item.id);
                  const inGreedy = execution.greedy.selectedIds.includes(item.id);
                  if (inOpt && inGreedy) {
                    compBadge = 'In Both Kits';
                    compClass = 'badge-both';
                  } else if (inOpt) {
                    compBadge = 'Optimal Only';
                    compClass = 'badge-opt';
                  } else if (inGreedy) {
                    compBadge = 'Greedy Only';
                    compClass = 'badge-greedy';
                  } else {
                    compBadge = 'Excluded';
                    compClass = 'badge-excluded';
                  }
                }

                return (
                  <div
                    key={item.id}
                    className={`sim-supply-card ${
                      mode === 'simulation'
                        ? `status-${packStatus}`
                        : strategy === 'optimal'
                          ? execution.result.selectedIds.includes(item.id)
                            ? 'status-packed'
                            : 'status-excluded'
                          : execution.greedy.selectedIds.includes(item.id)
                            ? 'status-packed'
                            : 'status-excluded'
                    }`}
                  >
                    <div className="supply-card-icon" style={{ color: visual.accent }}>
                      <Icon size={18} />
                    </div>
                    <div className="supply-card-details">
                      <div className="card-title-row">
                        <strong className="supply-card-name" title={item.name}>
                          {item.name}
                        </strong>
                        <span className="supply-inventory-num">#{idx + 1}</span>
                      </div>
                      <div className="supply-card-meta">
                        <span>{item.weight} kg</span>
                        <span>+{item.priority} pts</span>
                        <span className="supply-cat-tag">{item.category}</span>
                      </div>
                    </div>
                    <div className="supply-card-status">
                      {mode === 'comparison' ? (
                        <span className={`comp-tag ${compClass}`}>{compBadge}</span>
                      ) : packStatus === 'packing' ? (
                        <span className="status-badge packing-badge">Packing...</span>
                      ) : packStatus === 'packed' ? (
                        <span className="status-badge packed-badge">Packed</span>
                      ) : (
                        <span className="status-badge excluded-badge">Excluded</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column B: Central Packing Station */}
        <div className="sim-column packing-station-column" role="region" aria-label="Central packing station">
          <div className="column-title">
            <Scale size={15} />
            <h3>Central Packing Station</h3>
            <span className={`tag ${execution.optimal ? 'tag-optimal' : 'tag-incomplete'}`}>
              {execution.optimal ? 'Verified Optimal' : 'Feasible Solution'}
            </span>
          </div>

          <div className="packing-live-feedback" aria-live="polite">
            {status === 'idle' && (
              <p>Ready to simulate. Click <strong>Visualize Final Kit</strong> to watch items pack.</p>
            )}
            {status === 'packing' && stepMetrics.currentItem && (
              <p>
                Packing <strong>{stepMetrics.currentItem.name}</strong> ({stepMetrics.currentItem.weight} kg, +
                {stepMetrics.currentItem.priority} pts) into payload bay…
              </p>
            )}
            {status === 'complete' && (
              <p>
                {selectedSupplies.length === 0
                  ? 'Empty kit selected. Feasible under carrying limit.'
                  : `Packing sequence complete. ${selectedSupplies.length} relief supplies securely balanced.`}
              </p>
            )}
          </div>

          <EmergencyKitVisual
            capacity={mission.capacity}
            packedSupplies={packedItems}
            metrics={stepMetrics}
            optimal={execution.optimal}
          />

          <p className="packing-station-note">
            Each supply is taken whole or left behind. Pruning ensured invalid branches were discarded without
            compromising payload safety.
          </p>
        </div>

        {/* Column C: Mission Metrics & Capacity Meter */}
        <div className="sim-column metrics-column" role="region" aria-label="Live mission telemetry">
          <div className="column-title">
            <ArrowRight size={15} />
            <h3>Live Payload Metrics</h3>
          </div>

          <div className="live-metric-cards">
            {/* Packed Weight */}
            <div className="sim-metric-card">
              <span className="metric-label">Packed Weight</span>
              <div className="metric-value-row">
                <strong>{stepMetrics.packedWeight}</strong>
                <small>/ {mission.capacity} kg</small>
              </div>
              <span className="metric-subtext">
                {stepMetrics.remainingCapacity} kg remaining payload
              </span>
            </div>

            {/* Total Priority */}
            <div className="sim-metric-card">
              <span className="metric-label">Priority Impact</span>
              <div className="metric-value-row">
                <strong className="teal">{stepMetrics.packedPriority}</strong>
                <small>pts</small>
              </div>
              <span className="metric-subtext">Accumulated life-saving value</span>
            </div>

            {/* Capacity Utilization Meter */}
            <div className="sim-metric-card">
              <div className="meter-label-row">
                <span className="metric-label">Capacity Utilization</span>
                <strong>{stepMetrics.utilization.toFixed(1)}%</strong>
              </div>
              <div className="sim-meter-track" aria-hidden="true">
                <div
                  className={`sim-meter-fill ${
                    status === 'complete' && execution.optimal ? 'fill-teal' : 'fill-orange'
                  }`}
                  style={{ width: `${Math.min(100, stepMetrics.utilization)}%` }}
                />
              </div>
              <span className="metric-subtext">
                {mission.capacity === 0
                  ? 'Zero capacity limit'
                  : `${stepMetrics.packedWeight} kg used of ${mission.capacity} kg`}
              </span>
            </div>

            {/* Packed Item Count */}
            <div className="sim-metric-card">
              <span className="metric-label">Supplies Packed</span>
              <div className="metric-value-row">
                <strong>{stepMetrics.packedCount}</strong>
                <small>/ {mission.supplies.length}</small>
              </div>
              <span className="metric-subtext">
                {mission.supplies.length - stepMetrics.packedCount} supplies excluded from kit
              </span>
            </div>

            {/* Verification Status */}
            <div className="sim-status-banner">
              {execution.optimal ? (
                <>
                  <CheckCircle2 size={16} className="teal" />
                  <div>
                    <strong>Proven Optimal Solution</strong>
                    <p>Mathematical proof guarantees no combination yields higher priority.</p>
                  </div>
                </>
              ) : (
                <>
                  <TriangleAlert size={16} className="orange" />
                  <div>
                    <strong>Best-Known Solution</strong>
                    <p>Search stopped ({execution.status}). Valid feasible kit, unproven optimality.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
