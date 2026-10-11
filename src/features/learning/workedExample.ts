import { solve } from '../../algorithm/solver';
import { presets } from '../../domain/mission';
import { deriveResults } from '../results/resultModel';
// One tiny, bounded educational execution. Interactive missions still use the worker.
const mission = structuredClone(presets['Flood relief']);
const execution = solve(mission, { nodeLimit: 100, traceLimit: 500 });
export const workedExample = { mission, execution, metrics: deriveResults(execution, mission), root: execution.trace[0].node };
