import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight } from 'lucide-react';
import type { Execution } from '../../algorithm/solver';
import { lessons, type LessonId } from './lessons';

export interface LessonDetailCardProps {
  currentIndex: number;
  onNavigate: (index: number) => void;
  onToggleComplete: (id: LessonId) => void;
  isCompleted: boolean;
  targets: Record<LessonId, number | null>;
  execution: Execution | null;
  explore: (index: number) => void;
}

export function LessonDetailCard({
  currentIndex,
  onNavigate,
  onToggleComplete,
  isCompleted,
  targets,
  execution,
  explore,
}: LessonDetailCardProps) {
  const lesson = lessons[currentIndex];
  const targetIndex = targets[lesson.id];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < lessons.length - 1;
  const isCore = currentIndex < 7;

  return (
    <div
      className="lesson-detail-card"
      id={`lesson-panel-${currentIndex}`}
      role="tabpanel"
      aria-labelledby={`milestone-tab-${currentIndex}`}
    >
      {/* Detail Card Header */}
      <div className="detail-card-header">
        <div className="detail-badge-group">
          <span className="milestone-badge">
            MILESTONE {String(currentIndex + 1).padStart(2, '0')} OF 09
          </span>
          <span className={`category-tag ${isCore ? 'cat-core' : 'cat-support'}`}>
            {isCore ? 'Core Branch & Bound Search' : 'Supporting Heuristic & Theory'}
          </span>
        </div>
        <button
          type="button"
          className={`completion-toggle-btn ${isCompleted ? 'is-done' : ''}`}
          onClick={() => onToggleComplete(lesson.id)}
          aria-label={isCompleted ? `Mark ${lesson.title} as incomplete` : `Mark ${lesson.title} as completed`}
        >
          {isCompleted ? (
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

      {/* Main Title & Plain-English Explanation */}
      <h3 className="detail-lesson-title">{lesson.title}</h3>
      <p className="detail-lesson-simple">{lesson.simple}</p>

      {/* Technical Details Disclosure (Preserved exact structure and classes) */}
      <details className="technical-lesson">
        <summary>Technical details</summary>
        <p>{lesson.technical}</p>
      </details>

      {/* Trace Explorer Link or Explanation */}
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

      {/* Bottom Step-by-Step Navigation Bar */}
      <div className="detail-navigation-bar" role="navigation" aria-label="Lesson step navigation">
        <button
          type="button"
          className="nav-btn prev-btn"
          disabled={!hasPrev}
          onClick={() => hasPrev && onNavigate(currentIndex - 1)}
          aria-label={hasPrev ? `Previous: ${lessons[currentIndex - 1].title}` : 'Previous lesson'}
        >
          <ArrowLeft size={15} />
          <span>Previous Lesson</span>
        </button>

        <span className="nav-step-counter" aria-live="polite">
          {currentIndex + 1} / {lessons.length}
        </span>

        <button
          type="button"
          className="nav-btn next-btn"
          disabled={!hasNext}
          onClick={() => hasNext && onNavigate(currentIndex + 1)}
          aria-label={hasNext ? `Next: ${lessons[currentIndex + 1].title}` : 'Next lesson'}
        >
          <span>Next Lesson</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
