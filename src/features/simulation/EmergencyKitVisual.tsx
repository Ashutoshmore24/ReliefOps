import { Check, ShieldCheck } from 'lucide-react';
import type { Supply } from '../../domain/mission';
import { getCategoryVisual, type SimulationStepMetrics } from './simulationModel';

export function EmergencyKitVisual({
  capacity,
  packedSupplies,
  metrics,
  optimal,
}: {
  capacity: number;
  packedSupplies: Supply[];
  metrics: SimulationStepMetrics;
  optimal: boolean;
}) {
  const isPacking = metrics.status === 'packing';
  const isComplete = metrics.status === 'complete';

  return (
    <div className="kit-visual-container" aria-label="Visual emergency relief backpack container">
      {/* Backpack Outer Frame */}
      <div className={`kit-backpack ${isComplete ? 'complete' : ''} ${isPacking ? 'packing-active' : ''}`}>
        {/* Top Handle and Hardware */}
        <div className="backpack-handle-wrap" aria-hidden="true">
          <div className="backpack-handle" />
          <div className="backpack-strap-mounts">
            <span className="strap-mount" />
            <span className="strap-mount" />
          </div>
        </div>

        {/* Header HUD on the backpack */}
        <div className="backpack-header">
          <div className="backpack-badge">
            <ShieldCheck size={14} className={isComplete && optimal ? 'teal' : 'orange'} />
            <span>DISASTER RELIEF PAYLOAD BAY</span>
          </div>
          <span className="backpack-count" aria-live="polite">
            <strong>{metrics.packedCount}</strong> items packed
          </span>
        </div>

        {/* Cargo Compartment Area */}
        <div className="backpack-payload-area" role="region" aria-label="Supplies packed inside kit">
          {packedSupplies.length === 0 ? (
            <div className="backpack-empty-state">
              <div className="empty-stencil" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" />
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  <path d="M8 14h8" />
                  <path d="M12 10v8" />
                </svg>
              </div>
              <p>AWAITING PAYLOAD</p>
              <small>Carrying capacity: {capacity} kg</small>
            </div>
          ) : (
            <div className="packed-items-grid">
              {packedSupplies.map((item, index) => {
                const visual = getCategoryVisual(item.category, item.name);
                const Icon = visual.icon;
                const isLatest = isPacking && index === packedSupplies.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`packed-item-pill ${isLatest ? 'just-packed' : ''}`}
                    style={{ borderLeftColor: visual.accent }}
                  >
                    <div className="pill-icon" style={{ color: visual.accent }}>
                      <Icon size={14} />
                    </div>
                    <div className="pill-content">
                      <strong title={item.name}>{item.name}</strong>
                      <span className="pill-meta">
                        {item.weight} kg · +{item.priority} pts
                      </span>
                    </div>
                    <span className="pill-check" aria-hidden="true">
                      <Check size={12} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Backpack Bottom Hardware & Capacity Rail */}
        <div className="backpack-footer">
          <div className="backpack-capacity-rail">
            <div className="rail-info">
              <span>Payload Utilization</span>
              <strong>
                {metrics.packedWeight} / {capacity} kg ({metrics.utilization.toFixed(0)}%)
              </strong>
            </div>
            <div className="rail-track">
              <div
                className={`rail-fill ${isComplete && optimal ? 'rail-optimal' : 'rail-active'}`}
                style={{ width: `${Math.min(100, metrics.utilization)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
