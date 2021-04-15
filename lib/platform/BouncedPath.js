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

//todo add native shadows
//todo convert parent to parent index
//todo add slot:true for slotting contexts.
export function convertToBounceSequence(composedPath) {
  //todo here we can add patch for the native elements that are the innermost targets, such as <button type=submit>
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
      //todo } else if(check for native elements here??) {
    } else {
      const target = composedPath.pop();
      context.path.unshift(target);
      if (target instanceof HTMLSlotElement && composedPath[composedPath.length - 1]?.assignedSlot === target)
        return [context, ...res];
    }
  }
  return [context, ...res];
}

export function verifyBounceSequenceArguments(target, root) {
  if (!(target instanceof DocumentFragment || target === window || target === document))
    throw new Error('IllegalArgumentType: the "target" in bounceSequence(target, ...) must be either a shadowRoot, document or window.');
  if (!(root instanceof DocumentFragment || root instanceof Window))
    throw new Error('IllegalArgumentType: the "root" in bounceSequence(target, root) must be either true (as in composed: true), false (as in composed: false), or a Document or Window.');
}

//rule 1: The Bounce sequence always start with a document. Either the shadowRoot of an Element, or the document or window.
export function bounceSequence(startNode, endDocumentWindow, slotted = false) {
  let contexts = [];
  if (!slotted && startNode instanceof Element)
    contexts.push(startNode.shadowRoot);
  for (let t = startNode; t; t = t.host) {
    const path = [];
    for (; t; t = t.parentNode)
      path.push(t);
    t = path[path.length - 1];
    t === document && path.push(t = window);
    contexts.unshift({root: t, path, slotted});
    if (t === endDocumentWindow)
      break;
  }
  if (!slotted)                                     //we set the parentIndex from the host node contexts
    for (let i = 0; i < contexts.length; i++)
      contexts[i].parent = i - 1;
  for (let i = contexts.length - 1; i >= 0; i--) {
    const {path} = contexts[i];
    for (let j = 0; j < path.length - 1; j++) {
      const slot = path[j].assignedSlot;
      if (slot) {
        const slotMatroschka = bounceSequenceImpl(slot, path[j + 1].shadowRoot, true);
        if (!slotted) {                             //we set the parentIndex from the host node contexts
          slotMatroschka[0].parent = i;
          for (let k = 1; k < slotMatroschka.length; k++)
            slotMatroschka[k].parent = contexts.length + k - 1;
        }
        contexts = [...contexts, ...slotMatroschka];
      }
    }
  }
  return contexts;
}

function rootNodeIsCorrect(path, root) {
  return path.every(el => root === window ? el === window || el === document || el.getRootNode() === document : el.getRootNode() === root);
}

export function userAndUsedContextIndicies(contexts, i) {
  const res = [i];
  while (++i < contexts.length && res.includes(contexts[i].parent))
    res.push(i);
  return res;
}

export function verifyBouncedPath(bouncedPath) {
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
}

export function print(bouncedPath) {
  return bouncedPath.map(({root, parent, path, depth, slotted}, i) =>
    i + ': ' +
    (slotted ? 's: ' : 'h: ') +
    Array(depth).fill('  ').join('') +
    parent + ': ' +
    path.map(et => et.nodeName || 'window')
  );
}