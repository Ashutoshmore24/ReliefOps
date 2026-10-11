# ReliefOps

Client-side educational 0/1 knapsack application. Phases 1–5 are implemented: project foundation, verified solver, worker execution, mission editor, results dashboard, interactive algorithm explorer and beginner learning mode.

## Run

`npm install`, then `npm run dev`. Verification: `npm test`, `npm run lint`, `npm run build`.

## Solver contract

`solve(mission, options)` validates input and returns a single execution containing the best feasible kit, a ratio-greedy baseline, statistics and an ordered trace. Only status `optimal` proves optimality. It does not mutate mission inputs. Duplicate names are supported; IDs must be unique. Weights and capacity allow two decimal places and are converted to integer hundredths. Priority is a nonnegative integer. See `src/domain/mission.ts` for bounds and presets.

Best-bound-first selection uses exact rational comparisons with BigInt; equal bounds use node creation order. Supplies are sorted by exact descending value/weight ratio, then input order. Include children precede exclude children. Equal-value incumbent candidates retain the first encountered solution. Fractional relaxation provides an admissible bound; over-capacity branches and bounds no better than the incumbent are pruned. Display bounds are approximate numbers, but pruning never uses them. An overweight node's bound is its current priority for display and is never used as a feasible relaxation bound.

Trace events contain immutable snapshots of node weight, priority, display bound, incumbent, decision, selected IDs and prune reason. Node creation, activation, incumbent improvement, pruning and completion are all real solver events. Pruned count includes resolved terminal nodes. Explored count is the number of frontier removals. Created count includes the root.

## Verification and next phases

Tests compare against exhaustive enumeration on 500 seeded instances, cover edge cases, verify admissible bounds over partial states, and check trace consistency and determinism.

`execute(mission, options)` is the generator behind the synchronous compatibility wrapper and the Web Worker. It retains the verified search logic and yields progress every 32 inspected nodes in the worker. The worker yields to its event loop between batches so cancellation messages can be processed. Cancellation, node limits and trace limits return explicit incomplete statuses and the best feasible kit, with a remaining priority upper bound. Only exhausted frontiers return `optimal` and a `finished` event. Trace budgets reserve an entire transition plus completion; no event is silently dropped. Small budgets can stop before inspecting the root. Default UI limits are 10,000 inspected nodes and 40,000 trace events; configurable from 1 through 1,000,000. Limits are visible and do not change the unbounded solver API defaults.

Each run owns a worker and a monotonically increasing execution ID. Editing, replacing, undoing or changing limits terminates the previous worker and clears results/playback. Obsolete responses are ignored by both identity and execution ID. Explicit Cancel cooperatively stops at a batch boundary and returns a partial kit. Worker startup, runtime, decoding and malformed-message errors show a recoverable error state. Unmount disposes the worker. Protocol, orchestration and presentation live separately under `src/worker`, `src/features` and `src/playback`.

The mission editor provides all four presets, editable mission name/capacity, supply name/category/weight/priority, add/duplicate/delete, keyboard-operable move buttons and one-level undo. New supplies use stable UUIDs; duplicate names keep distinct identities. Raw input strings preserve blank/invalid fields for inline validation.

## Phase 4 explorer

The explorer processes the real immutable execution trace into a node index with per-node event histories. Snapshot queries use binary search and never show future node states. Only created nodes up to the current playback step appear. The latest incumbent event identifies the best-known node; a prior incumbent can become a feasible candidate or a pruned node. Weight constraints identify infeasible nodes. Inspection displays the incumbent recorded at that node's latest event separately from the current step's global incumbent.

Each node now records a `boundCalculation`: current priority, contribution of whole remaining supplies, fractional weight/item weight/priority and exact rational numerator/denominator strings. These components are captured inside the existing fractional-bound calculation, not recalculated by React. Overweight nodes record `null`. Worker validation checks these fields. Search ordering and pruning arithmetic are unchanged.

Playback supports play/pause, next/previous, restart/replay, speed and a keyboard-operable position slider. It starts paused, stops at the final recorded event and preserves incomplete statuses. Selecting a node pauses playback without changing the current step; the current-step explanation stays synchronized while the inspector displays the selected snapshot. Timer updates are guarded by execution identity so obsolete callbacks cannot resurrect cleared results. Reduced-motion preferences disable transitions and cap playback at one event per second. Live announcements are muted during automatic playback.

The tree uses labeled include/exclude edges and text/icons/colors for six statuses. It supports branch collapse/expansion, zoom, background drag/scroll panning and fit-to-view. Rendering is capped at 60 nodes except when a selected path requires more ancestors (at most 101 for the validated 100-item maximum). Hidden counts are explicit; collapse preserves the inspected/current path. Arrow keys/Home/End navigate visible nodes, Enter/Space selects and C toggles a branch. Native buttons and an accessible tree structure expose node data to keyboard and assistive-technology users. The textual alternative renders at most 31 revealed events near the current step; the slider reaches any event. No visualization dependencies were added.

Explanations distinguish the current event from the selected node's inspector. Bounds, prune reasons, decisions and incumbent updates all use trace values. Incomplete executions show their stop reason and remaining upper bound without an optimality proof. The final result summary describes the completed execution; the explorer indicates when that proof has been revealed in playback.

## Phase 5 results and learning

The full-width results dashboard shows proof status, selected priority/count/weight, carrying capacity, exact scaled-unit remaining capacity and utilization. Selected and excluded supplies retain IDs and display inventory numbers to distinguish duplicate names. Exclusion from the returned kit is explicitly different from pruning a search branch. Empty kits are feasible in this model; no “no feasible solution” state is fabricated. Cancelled runs retain their feasible kit without claiming optimality; failed runs display an error state with no verified result metrics.

`src/features/results/resultModel.ts` derives presentation metrics from the execution and mission. Peak frontier size is reconstructed by adding created nodes and removing inspected nodes; current frontier size and prune reasons come from the same trace. Existing node counts remain sourced from the solver. Duration is omitted because the execution contract does not measure it. The comparison chart has an equivalent accessible data table showing actual priority, weight and selected count for both strategies. Percentage change is `(BnB priority − greedy priority) / greedy priority × 100`; it is omitted as undefined for a zero greedy baseline. Incomplete kits may trail greedy and are described as such, without an invented improvement or proof.

Dashboard links seek the actual last incumbent update, first recorded prune or completed proof event, pause playback, clear manual node selection and focus the explorer heading. The explorer offers a return-to-results action. Mission validation is memoized so metrics are not recomputed from an entire trace on every playback tick. Edits still invalidate results and related lesson links immediately.

Learning mode provides nine keyboard-operable lessons covering the problem, whole-item decisions, branching, fractional bounds, safe pruning, incumbent, optimality, greedy and exponential worst-case complexity. Each has optional technical details and links into matching real events from the current execution. Missing events, especially proof in incomplete runs, are explained instead of invented. A clearly labeled separate Flood relief example runs the same solver once with small explicit budgets (100 nodes / 500 trace events); example answers and bound arithmetic derive from that execution. Loading the example uses the editor's existing preset/undo flow; interactive optimization still runs in the worker.

## Remaining limitations

The algorithm still has exponential worst-case complexity. Cancellation latency depends on one batch, and frontier sorting can become costly on very large searches. Indexing an execution requires linear time and memory once when it is loaded; extremely large traces can still have an initial processing cost. Fit-to-view may make dense trees too small to read; zoom or use the textual alternative and inspector. The remaining bound is displayed approximately; pruning continues to use exact rationals. Missions remain in memory and reload resets them. Resource settings deliberately invalidate the execution. Browser editing and cancellation are separate: editing discards the old result, while Cancel retains the partial kit. Presentation mode uses a focused page rather than requesting browser fullscreen. Guided topics with no matching event remain available with an explicit explanation; they do not invent trace steps.

Run from `C:\Users\win11\Documents\ReliefOps`:

```powershell
npm install
npm run dev -- --host 127.0.0.1
npm test
npm run lint
npm run build
npm run preview -- --host 127.0.0.1
```

Open the Local URL printed by Vite. For a quick demo, optimize Flood relief (optimal priority 60, greedy 50), step through the trace, then edit capacity to confirm invalidation. Set the node limit to 2 and optimize to demonstrate an explicitly incomplete result.

For Phase 5, inspect Selected/Excluded supplies, the strategy table/chart and Algorithm statistics. Use “See the optimality proof” or “Explain a real pruning decision” to open the corresponding paused explorer step. Open a beginner lesson and use “Show in my search” to connect the concept to that execution.


## Final phase: presentation mode

Use **Load Flood relief demo**, then **Optimize kit**, then **Enter presentation**. The existing worker computes the demonstration: ratio-greedy chooses water + food (priority 50), while the proven optimum chooses medical + food (priority 60) at 15 kg. Demo loading uses the existing preset/undo flow and invalidates previous results. Presentation is also available for incomplete executions, always labeled as unproven.

The focused page reuses the results dashboard and algorithm explorer. Five topic buttons seek real events for the problem, branching, bounding, pruning and final result. Topic navigation pauses playback; event navigation, Play/Pause/Replay, restart, speed, tree inspection and text trace retain their existing behavior. Missing events are explained. Returned-kit metrics are distinguished from the step's incumbent. Expand result details for the full breakdown and greedy comparison. Escape or Exit presentation returns to the editor with playback paused and focus restored to the entry button. Presentation starts paused at the first event. Native buttons remain keyboard accessible; responsive stacking and the existing reduced-motion preference apply.

Final release verification: `npm.cmd test` passed 116 tests in 9 files, including 7 presentation tests and the existing 500-instance exhaustive oracle check. `npm.cmd run lint` passed. `npm.cmd run build` passed (main JavaScript 261.42 kB / 81.39 kB gzip; worker 6.13 kB). Manual checks against the production preview verified worker optimization, paused presentation entry, real pruning/final-event navigation, playback advancing and pausing, Escape exit with focus restoration, and responsive stacking at 390 × 844. Reduced-motion rendering and incomplete/cancelled presentation semantics were tested in the automated suite. These are focused checks, not a comprehensive browser automation suite.
