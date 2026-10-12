import { Check, Flag, Sparkles } from 'lucide-react';
import { lessons, type LessonId } from './lessons';

export interface SnakePathJourneyProps {
  activeIndex: number;
  onSelectLesson: (index: number) => void;
  completedLessons: ReadonlySet<LessonId>;
}

// Milestone coordinates in viewBox "0 0 720 400"
const DESKTOP_COORDINATES = [
  { x: 120, y: 70, col: 0, row: 0 },  // 01: Problem
  { x: 360, y: 70, col: 1, row: 0 },  // 02: 0/1 Choices
  { x: 600, y: 70, col: 2, row: 0 },  // 03: Branching
  { x: 600, y: 200, col: 2, row: 1 }, // 04: Bounding
  { x: 360, y: 200, col: 1, row: 1 }, // 05: Pruning
  { x: 120, y: 200, col: 0, row: 1 }, // 06: Incumbent
  { x: 120, y: 330, col: 0, row: 2 }, // 07: Optimality
  { x: 360, y: 330, col: 1, row: 2 }, // 08: Greedy
  { x: 600, y: 330, col: 2, row: 2 }, // 09: Complexity
];

// Short badge for each milestone
const MILESTONE_SHORT_LABELS = [
  '01 · Problem',
  '02 · 0/1 Choice',
  '03 · Branching',
  '04 · Bounding',
  '05 · Pruning',
  '06 · Incumbent',
  '07 · Optimality',
  '08 · Greedy',
  '09 · Complexity',
];

export function SnakePathJourney({
  activeIndex,
  onSelectLesson,
  completedLessons,
}: SnakePathJourneyProps) {
  // SVG full snake track path
  // Row 0: 120,70 -> 600,70
  // Turn 1: curve down to 600,200
  // Row 1: 600,200 -> 120,200
  // Turn 2: curve down to 120,330
  // Row 2: 120,330 -> 600,330
  const snakePathD =
    'M 120 70 L 600 70 C 690 70, 690 200, 600 200 L 120 200 C 30 200, 30 330, 120 330 L 600 330';

  return (
    <div className="snake-journey-container" role="region" aria-label="Branch and Bound snake-path roadmap">
      {/* Legend / Journey Progress Bar */}
      <div className="journey-track-header">
        <div className="journey-stage-badge">
          <Flag size={14} className="teal" />
          <span>ALGORITHM ROADMAP</span>
          <small>9 Milestones</small>
        </div>
        <div className="journey-legend">
          <span className="legend-item"><i className="legend-dot dot-core" /> Core Search (01–07)</span>
          <span className="legend-item"><i className="legend-dot dot-support" /> Supporting Concepts (08–09)</span>
          <span className="legend-item"><i className="legend-dot dot-done" /> Completed</span>
        </div>
      </div>

      {/* Desktop & Tablet Winding SVG Canvas */}
      <div className="snake-board-desktop" aria-hidden="false">
        <svg
          className="snake-svg-track"
          viewBox="0 0 720 400"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="snakeGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#48937e" />
              <stop offset="50%" stopColor="#75d7b7" />
              <stop offset="100%" stopColor="#f39457" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d={snakePathD}
            fill="none"
            stroke="#21354b"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Inner Accent Line */}
          <path
            d={snakePathD}
            fill="none"
            stroke="#314c69"
            strokeWidth="3"
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
        </svg>

        {/* Milestone Node Buttons */}
        <div className="milestones-grid" role="tablist" aria-label="Learning milestones">
          {lessons.map((lesson, index) => {
            const coord = DESKTOP_COORDINATES[index];
            const isCompleted = completedLessons.has(lesson.id);
            const isActive = activeIndex === index;
            const isCore = index < 7;

            // Percentage positioning inside the container
            const leftPct = (coord.x / 720) * 100;
            const topPct = (coord.y / 400) * 100;

            return (
              <div
                key={lesson.id}
                className={`milestone-wrapper ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}
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
                    isCompleted ? 'node-completed' : ''
                  } ${isCore ? 'node-core' : 'node-support'}`}
                  onClick={() => onSelectLesson(index)}
                  aria-label={`Milestone ${index + 1}: ${lesson.title}${isCompleted ? ' (Completed)' : ''}`}
                >
                  <span className="milestone-ring" />
                  <span className="milestone-inner">
                    {isCompleted ? (
                      <Check size={18} className="node-check-icon" aria-hidden="true" />
                    ) : (
                      <span className="milestone-number">{String(index + 1).padStart(2, '0')}</span>
                    )}
                  </span>
                </button>

                <div className="milestone-caption">
                  <span className="caption-label">{MILESTONE_SHORT_LABELS[index]}</span>
                  {isActive && <span className="caption-active-dot" aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Winding Sequence (< 640px) */}
      <div className="snake-board-mobile" role="tablist" aria-label="Learning milestones (mobile list)">
        <div className="mobile-connector-line" aria-hidden="true" />
        {lessons.map((lesson, index) => {
          const isCompleted = completedLessons.has(lesson.id);
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
                isCompleted ? 'mobile-completed' : ''
              }`}
              onClick={() => onSelectLesson(index)}
              aria-label={`Milestone ${index + 1}: ${lesson.title}${isCompleted ? ' (Completed)' : ''}`}
            >
              <div className="mobile-node-circle">
                {isCompleted ? (
                  <Check size={16} className="node-check-icon" aria-hidden="true" />
                ) : (
                  <span>{String(index + 1).padStart(2, '0')}</span>
                )}
              </div>
              <div className="mobile-node-info">
                <span className="mobile-node-title">{lesson.title}</span>
                <span className="mobile-node-tag">
                  {isCore ? 'Core Search' : 'Supporting'} · {isCompleted ? 'Completed' : 'Available'}
                </span>
              </div>
              {isActive && <Sparkles size={14} className="orange mobile-active-sparkle" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
