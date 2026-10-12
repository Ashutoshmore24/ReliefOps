import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Flag,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type { Execution } from '../../algorithm/solver';
import { learningTargets, lessons, type LessonId } from './lessons';
import { workedExample } from './workedExample';

const STORAGE_KEY = 'reliefops_completed_lessons';

function loadSavedProgress(): Set<LessonId> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((id): id is LessonId => lessons.some(l => l.id === id)));
        }
      }
    }
  } catch {
    // Graceful fallback
  }
  return new Set<LessonId>();
}

function saveProgress(completed: ReadonlySet<LessonId>) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
    }
  } catch {
    // Graceful fallback
  }
}

// Milestone layout coordinates in viewBox "0 0 720 380"
const DESKTOP_COORDINATES = [
  { x: 120, y: 65 },  // 01: Problem
  { x: 360, y: 65 },  // 02: 0/1 Choices
  { x: 600, y: 65 },  // 03: Branching
  { x: 600, y: 190 }, // 04: Bounding
  { x: 360, y: 190 }, // 05: Pruning
  { x: 120, y: 190 }, // 06: Incumbent
  { x: 120, y: 315 }, // 07: Optimality
  { x: 360, y: 315 }, // 08: Greedy
  { x: 600, y: 315 }, // 09: Complexity
];

const MILESTONE_SHORT_LABELS = [
  '01 · Problem',
  '02 · 0/1 Decisions',
  '03 · Branching',
  '04 · Bounding',
  '05 · Pruning',
  '06 · Incumbent',
  '07 · Optimality',
  '08 · Greedy Shortcut',
  '09 · Complexity',
];

export function LearningPanel({
  execution,
  explore,
  loadExample,
}: {
  execution: Execution | null;
  explore: (index: number) => void;
  loadExample: () => void;
}) {
  const targets = useMemo(() => learningTargets(execution), [execution]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<LessonId>>(() => loadSavedProgress());

  // Save progress changes
  const toggleComplete = useCallback((id: LessonId) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveProgress(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    const empty = new Set<LessonId>();
    setCompleted(empty);
    saveProgress(empty);
  }, []);

  const completedCount = completed.size;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  // Worked example data
  const sample = workedExample;
  const bound = sample.root.boundCalculation!;
  const chosenNames = (ids: string[]) =>
    sample.mission.supplies.filter(item => ids.includes(item.id)).map(item => item.name).join(' + ') || 'Empty kit';

  // SVG snake path connecting the 9 milestones
  const snakePathD =
    'M 120 65 L 600 65 C 685 65, 685 190, 600 190 L 120 190 C 35 190, 35 315, 120 315 L 600 315';

  return (
    <section className="panel learning-mode" id="learning" aria-labelledby="learning-heading">
      {/* Section Header */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">04 / BEGINNER LEARNING MODE</p>
          <h2 id="learning-heading" tabIndex={-1}>
            <BookOpen size={22} /> Understand the search
          </h2>
        </div>
        <a className="section-link" href={execution ? '#result-heading' : '#feedback-heading'}>
          Back to results
        </a>
      </div>

      <p className="muted">
        Follow the interactive algorithm roadmap from initial problem to proven optimality. Click any milestone to
        explore the idea in plain English or connect directly to a real event in your search.
      </p>

      {/* Learning Journey Overview & Progress Bar */}
      <div className="journey-progress-card">
        <div className="journey-progress-header">
          <div className="journey-progress-info">
            <Trophy size={16} className={completedCount === 9 ? 'teal' : 'orange'} />
            <strong>Algorithm Learning Progress</strong>
            <span>
              {completedCount} of {lessons.length} milestones completed ({progressPercent}%)
            </span>
          </div>

          <div className="journey-progress-actions">
            {completedCount > 0 && (
              <button
                type="button"
                className="reset-progress-btn"
                onClick={resetProgress}
                aria-label="Reset learning progress"
              >
                <RotateCcw size={12} /> Reset progress
              </button>
            )}
          </div>
        </div>

        <div className="journey-progress-track" aria-hidden="true">
          <div
            className={`journey-progress-fill ${completedCount === 9 ? 'fill-complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Two-Column Layout: Snake Path Journey + Worked Example */}
      <div className="learning-layout">
        {/* Left Column: Snake Route and Active Lesson Panels */}
        <div className="learning-journey-column">
          {/* Snake Path Canvas */}
          <div className="snake-journey-wrapper" role="region" aria-label="Interactive Branch and Bound snake roadmap">
            <div className="journey-track-header">
              <div className="journey-stage-badge">
                <Flag size={13} className="teal" />
                <span>SEARCH PROGRESSION ROADMAP</span>
              </div>
              <div className="journey-legend">
                <span className="legend-item"><i className="legend-dot dot-core" /> Core Search (01–07)</span>
                <span className="legend-item"><i className="legend-dot dot-support" /> Supporting (08–09)</span>
                <span className="legend-item"><i className="legend-dot dot-done" /> Completed</span>
              </div>
            </div>

            {/* Desktop SVG Board */}
            <div className="snake-board-desktop">
              <svg
                className="snake-svg-track"
                viewBox="0 0 720 380"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                {/* Background Track */}
                <path
                  d={snakePathD}
                  fill="none"
                  stroke="#1b2d42"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dashed Center Guide */}
                <path
                  d={snakePathD}
                  fill="none"
                  stroke="#2c4463"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                />
              </svg>

              {/* Milestone Node Buttons in 3x3 Snake Layout */}
              <div className="milestones-grid" role="tablist" aria-label="Learning milestones">
                {lessons.map((lesson, index) => {
                  const coord = DESKTOP_COORDINATES[index];
                  const isDone = completed.has(lesson.id);
                  const isActive = activeIndex === index;
                  const isCore = index < 7;

                  const leftPct = (coord.x / 720) * 100;
                  const topPct = (coord.y / 380) * 100;

                  return (
                    <div
                      key={lesson.id}
                      className={`milestone-wrapper ${isActive ? 'is-active' : ''} ${isDone ? 'is-completed' : ''}`}
                      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                    >
                      <button
                        type="button"
                        role="tab"
                        id={`milestone-tab-${index}`}
                        aria-selected={isActive}
                        aria-controls={`lesson-panel-${index}`}
                        tabIndex={isActive ? 0 : -1}
                        className={`milestone-node ${isActive ? 'node-active' : ''} ${
                          isDone ? 'node-completed' : ''
                        } ${isCore ? 'node-core' : 'node-support'}`}
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Milestone ${index + 1}: ${lesson.title}${isDone ? ' (Completed)' : ''}`}
                      >
                        <span className="milestone-ring" />
                        <span className="milestone-inner">
                          {isDone ? (
                            <Check size={18} className="node-check-icon" aria-hidden="true" />
                          ) : (
                            <span className="milestone-number">{String(index + 1).padStart(2, '0')}</span>
                          )}
                        </span>
                      </button>

                      <div className="milestone-caption">
                        <span className="caption-label">{MILESTONE_SHORT_LABELS[index]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Vertical Sequence (< 680px) */}
            <div className="snake-board-mobile" role="tablist" aria-label="Learning milestones (mobile list)">
              <div className="mobile-connector-line" aria-hidden="true" />
              {lessons.map((lesson, index) => {
                const isDone = completed.has(lesson.id);
                const isActive = activeIndex === index;
                const isCore = index < 7;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    role="tab"
                    id={`milestone-mobile-tab-${index}`}
                    aria-selected={isActive}
                    aria-controls={`lesson-panel-${index}`}
                    className={`mobile-milestone-row ${isActive ? 'mobile-active' : ''} ${
                      isDone ? 'mobile-completed' : ''
                    }`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Milestone ${index + 1}: ${lesson.title}${isDone ? ' (Completed)' : ''}`}
                  >
                    <div className="mobile-node-circle">
                      {isDone ? (
                        <Check size={15} className="node-check-icon" aria-hidden="true" />
                      ) : (
                        <span>{String(index + 1).padStart(2, '0')}</span>
                      )}
                    </div>
                    <div className="mobile-node-info">
                      <span className="mobile-node-title">{lesson.title}</span>
                      <span className="mobile-node-tag">
                        {isCore ? 'Core Search' : 'Supporting'} · {isDone ? 'Completed' : 'Available'}
                      </span>
                    </div>
                    {isActive && <Sparkles size={14} className="orange" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Lesson Panels (Renders all 9 tabpanels so DOM is accessible and static tests pass) */}
          <div className="lesson-panels-container">
            {lessons.map((lesson, index) => {
              const targetIndex = targets[lesson.id];
              const isDone = completed.has(lesson.id);
              const hasPrev = index > 0;
              const hasNext = index < lessons.length - 1;
              const isCore = index < 7;
              const isCurrent = index === activeIndex;

              return (
                <div
                  key={lesson.id}
                  id={`lesson-panel-${index}`}
                  role="tabpanel"
                  aria-labelledby={`milestone-tab-${index}`}
                  hidden={!isCurrent}
                  className={`lesson-detail-panel ${isCurrent ? 'is-visible' : ''}`}
                >
                  {/* Detail Panel Header */}
                  <div className="detail-panel-header">
                    <div className="detail-badge-group">
                      <span className="milestone-badge">
                        MILESTONE {String(index + 1).padStart(2, '0')} OF 09
                      </span>
                      <span className={`category-tag ${isCore ? 'cat-core' : 'cat-support'}`}>
                        {isCore ? 'Core Branch & Bound Search' : 'Supporting Concept'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`completion-toggle-btn ${isDone ? 'is-done' : ''}`}
                      onClick={() => toggleComplete(lesson.id)}
                      aria-label={isDone ? `Mark ${lesson.title} as incomplete` : `Mark ${lesson.title} as completed`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 size={15} className="teal" />
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          <span>Mark as completed</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Title and Simple Explanation */}
                  <h3 className="detail-lesson-title">{lesson.title}</h3>
                  <p className="detail-lesson-simple">{lesson.simple}</p>

                  {/* Technical Details Disclosure (Preserves exact structure tested by vitest) */}
                  <details className="technical-lesson">
                    <summary>Technical details</summary>
                    <p>{lesson.technical}</p>
                  </details>

                  {/* Search Connection Link */}
                  <div className="detail-search-connection">
                    {targetIndex !== null ? (
                      <button
                        type="button"
                        className="show-in-search-btn"
                        aria-label={`Show in my search: ${lesson.title}`}
                        onClick={() => explore(targetIndex)}
                      >
                        <span>Show in my search</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <p className="lesson-unavailable">
                        {!execution
                          ? 'Run an optimization to connect this idea to your search.'
                          : lesson.id === 'proof' || lesson.id === 'greedy'
                            ? 'This execution has no optimality-proof event. The search is incomplete.'
                            : 'No matching event was recorded in this execution.'}
                      </p>
                    )}
                  </div>

                  {/* Bottom Navigation */}
                  <div className="detail-navigation-bar" role="navigation" aria-label="Milestone step navigation">
                    <button
                      type="button"
                      className="nav-btn prev-btn"
                      disabled={!hasPrev}
                      onClick={() => hasPrev && setActiveIndex(index - 1)}
                      aria-label={hasPrev ? `Previous: ${lessons[index - 1].title}` : 'Previous milestone'}
                    >
                      <ArrowLeft size={14} />
                      <span>Previous</span>
                    </button>

                    <span className="nav-step-counter" aria-live="polite">
                      Milestone {index + 1} of {lessons.length}
                    </span>

                    <button
                      type="button"
                      className="nav-btn next-btn"
                      disabled={!hasNext}
                      onClick={() => hasNext && setActiveIndex(index + 1)}
                      aria-label={hasNext ? `Next: ${lessons[index + 1].title}` : 'Next milestone'}
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Worked Example (Preserved exact structure and content) */}
        <aside className="worked-example" aria-labelledby="example-heading">
          <span className="tag">PREPARED EXAMPLE · SEPARATE FROM YOUR MISSION</span>
          <h3 id="example-heading">Why the shortcut can lose</h3>
          <p>
            Flood relief · {sample.mission.capacity} kg capacity. These values come from a real, bounded run of the same
            solver.
          </p>

          <div className="table-scroll">
            <table className="result-table">
              <caption>Worked-example supplies</caption>
              <thead>
                <tr>
                  <th scope="col">Supply</th>
                  <th scope="col">Weight</th>
                  <th scope="col">Priority</th>
                </tr>
              </thead>
              <tbody>
                {sample.mission.supplies.map(item => (
                  <tr key={item.id}>
                    <th scope="row">{item.name}</th>
                    <td>{item.weight} kg</td>
                    <td>{item.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ol className="worked-steps">
            <li>
              <strong>Greedy takes the highest ratio first.</strong>
              <p>
                {chosenNames(sample.execution.greedy.selectedIds)} gives {sample.execution.greedy.priority} points at{' '}
                {sample.execution.greedy.weight} kg.
              </p>
            </li>
            <li>
              <strong>Branching considers other combinations.</strong>
              <p>
                {chosenNames(sample.execution.result.selectedIds)} gives {sample.execution.result.priority} points at{' '}
                {sample.execution.result.weight} kg.
              </p>
            </li>
            <li>
              <strong>The initial bound is optimistic.</strong>
              <p>
                {bound.basePriority} + {bound.wholePriority} + ({bound.fractionWeight} / {bound.fractionItemWeight}) ×{' '}
                {bound.fractionItemPriority} = {sample.root.upperBound.toFixed(2)}. The fraction is only for estimating;
                it is not packed into the final kit.
              </p>
            </li>
            <li>
              <strong>Completed search supplies the proof.</strong>
              <p>
                {sample.execution.optimal
                  ? `All promising branches are resolved. Priority ${sample.execution.result.priority} is proven optimal for this prepared example.`
                  : 'This example run stopped before proof.'}
              </p>
            </li>
          </ol>

          <button type="button" className="secondary load-example-btn" onClick={loadExample}>
            Load this mission into the editor <ArrowRight size={15} />
          </button>
          <p className="trace-note">
            Loading replaces your current mission and clears its results; Undo last edit restores it. Choose Optimize kit
            to explore the example in the worker.
          </p>

          <div className="learning-takeaway">
            <strong>Feasible ≠ proven optimal</strong>
            <p>
              A kit can fit the capacity and still be improved. The empty kit is always feasible in this model; “all
              items are overweight” is not “no feasible solution.”
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
