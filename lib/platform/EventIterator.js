import {userAndUsedContextIndicies} from "./BouncedPath.js";

function getCurrentTarget(phase, path, targetIndex) {
  if (phase === 1 && targetIndex < path.length - 1)
    return path[path.length - targetIndex - 1];
  if (phase === 2 && targetIndex === 0)
    return path[0];
  if (phase === 3 && targetIndex < path.length - 1)
    return path[targetIndex + 1];
}

export function EventIterator(contexts) {
  let currentTarget;
  let target;
  let path;
  let currentContext;
  let currentRoot;
  const stopped = [];
  const prevented = [];

  let contextI = 0;
  let phase = 1;
  let targetI = -1;

  return {
    next: function () {
      targetI++;
      for (; contextI < contexts.length; contextI++, phase = 1, targetI = 0) {
        currentContext = contexts[contextI];
        currentRoot = currentContext.root;
        path = currentContext.path;
        target = path[0];
        for (; phase < 4; phase++, targetI = 0) {
          currentTarget = getCurrentTarget(phase, path, targetI);
          if (currentTarget)
            return {value: {currentTarget, phase}, done: false};
        }
      }
      phase = 4, contextI = 0;
      return {done: true};
    },
    get phase() {
      return phase;
    },
    get path() {
      return path;
    },
    get target() {
      return target;
    },
    get currentTarget() {
      return currentTarget;
    },
    get currentRoot() {
      return currentRoot;
    },
    get contexts() {
      return contexts;
    },
    skipContext() {
      contextI++, phase = 1, targetI = -1;
    },
    get isStopped() {
      return stopped[contextI];
    },
    stop(val) {
      stopped[contextI] !== 2 && (stopped[contextI] = val);
    },
    isPrevented(i = contextI) {
      return !!prevented[i];
    },
    prevent(i = contextI) {
      userAndUsedContextIndicies(contexts, i).forEach(i => prevented[i] = true);
    }
  };
}