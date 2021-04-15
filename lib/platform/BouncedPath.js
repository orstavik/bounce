//todo Do I need to add the host/slot type for the context? it has a lot of meaning for the default action?
//todo Or do I simply use the native composedPath()?

export function composedPath(target, root) {
  const res = [];
  while (target) {
    res.push(target);
    if (target === root)
      return res;
    target = target === document ? window : target.assignedSlot || target.parentNode || target.host;
  }
  throw new Error('The propagation root (shadowRoot or window) is not an ancestor of the target of the event (dispatch).');
}

export function convertToBounceSequence(composedPath) {
  return convertToBounceSequenceImpl(composedPath);
}

function convertToBounceSequenceImpl(composedPath, parent) {
  const root = composedPath.pop();
  const context = {parent, root, path: [root]};
  let res = [];
  while (composedPath.length) {
    if (composedPath[composedPath.length - 1] instanceof ShadowRoot) {
      const shadow = convertToBounceSequenceImpl(composedPath, root);
      res = [...shadow, ...res];
    } else {
      const target = composedPath.pop();
      context.path.unshift(target);
      if (target instanceof HTMLSlotElement && composedPath[composedPath.length - 1]?.assignedSlot === target)
        return [context, ...res];
    }
  }
  return [context, ...res];
}

export function bounceSequence(target, root) {
  if (!(target instanceof EventTarget || target instanceof Window))
    throw new Error('IllegalArgumentType: the "target" in bounceSequence(target, ...) must be either an EventTarget or Window.');
  if (root === true)
    root = window;
  else if (root === undefined || root === false)
    root = target.getRootNode();
  else if (!(root instanceof DocumentFragment || root instanceof Window))
    throw new Error('IllegalArgumentType: the "root" in bounceSequence(target, root) must be either true (as in composed: true), false (as in composed: false), or a Document or Window.');
  return bounceSequenceImpl(target, root, undefined);
}

function bounceSequenceImpl(startNode, endDocumentWindow, parent) {
  let contexts = [];
  for (let t = startNode; t; t = t.host) {
    const path = [];
    for (; t; t = t.parentNode)
      path.push(t);
    t = path[path.length - 1];
    t === document && path.push(t = window);
    contexts[0] && (contexts[0].parent = t);
    contexts.unshift({root: t, path, parent});
    if (t === endDocumentWindow)
      break;
  }
  for (let i = contexts.length - 1; i >= 0; i--) {
    const {root, path} = contexts[i];
    for (let j = 0; j < path.length - 1; j++) {
      const mightBeSlotted = path[j];
      const mightBeHost = path[j + 1];
      const slot = mightBeSlotted.assignedSlot;
      const shadow = mightBeHost.shadowRoot;
      if (slot && shadow)
        contexts = [...contexts, ...(bounceSequenceImpl(slot, shadow, root))];
    }
  }
  return contexts;
}

export function userAndUsedContextIndicies(contexts, i) {
  const res = [i];
  while (++i < contexts.length && res.includes(contexts[i].parent))
    res.push(i);
  return res;
}

export function print(bouncedPath) {
  if (!bouncedPath.every(({root, path}) => rootNodeIsCorrect(path, root)))
    throw new Error('BouncedPathBug: root node error.');
  if (!!bouncedPath.find((context, i) => context.parent >= i))
    throw new Error('BouncedPathBug 1: A UseD document is listed before its UseR document.');
  bouncedPath[0].depth = 0;
  for (let i = 1; i < bouncedPath.length; i++) {
    const context = bouncedPath[i];
    context.depth = bouncedPath[context.parent].depth + 1;
  }
  for (let i = 0; i < bouncedPath.length; i++) {
    const usedContext = bouncedPath[i];
    const parentContext = bouncedPath[usedContext.parent];
    for (let j = usedContext.parent + 1; j < i; j++) {
      const inTheMiddleContext = bouncedPath[j];
      if (inTheMiddleContext.depth <= parentContext.depth)
        throw new Error('BouncedPathBug 2: Maybe sibling document listed before a nested document?');
    }
  }
  return bouncedPath.map(({root, parent, path, depth, slotted}, i) =>
    i + ': ' +
    (slotted ? 's: ' : 'h: ') +
    Array(depth).fill('  ').join('') +
    parent + ': ' +
    // (host? host.nodeName : root.host ? root.host.nodeName : 'window') + ': ' +
    path.map(et => et.nodeName || 'window')
  );
}