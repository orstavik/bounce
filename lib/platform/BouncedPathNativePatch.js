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

export function bounceSequence(target, root) {
  if (!(target instanceof EventTarget || target instanceof Window))
    throw new Error('IllegalArgumentType: the "target" in bounceSequence(target, ...) must be either an EventTarget or Window.');
  if (root === true)
    root = window;
  else if (root === undefined || root === false)
    root = target.getRootNode();
  else if (!(root instanceof DocumentFragment || root instanceof Window))
    throw new Error('IllegalArgumentType: the "root" in bounceSequence(target, root) must be either true (as in composed: true), false (as in composed: false), or a Document or Window.');
  return bounceSequenceImpl(target, root, false);
}

const aSlot = document.createElement('slot');
const aShadow = new DocumentFragment();
const slotContext = {root: aShadow, path: [aSlot, aShadow]};
const noSlotContext = {root: aShadow, path: [aShadow]};
const nativeSlotHosts = ['A', 'DETAILS'];

//add the host here, because we need this when the default action runs. we need to check for attributes that turn on/off default action listeners..
//the native elements has attribute observers that add/remove preventable event listeners depending on state.
function getNativeShadow(host) {
  return nativeSlotHosts.includes(host.tagName) ?
    Object.assign({host}, slotContext) :
    host.tagName && host.tagName.indexOf('-') < 0 && Object.assign({}, noSlotContext, {slotted: false, host});
}

//add the host here, because we need this when the default action runs. we check for default action ..
function getNativeShadowSlotOnly(host) {
  return nativeSlotHosts.includes(host.tagName) && Object.assign({}, slotContext, {slotted: true, host});
}

function bounceSequenceImpl(startNode, endDocumentWindow, slotted) {
  let contexts = [], nativeHostShadow;
  if (!slotted && (nativeHostShadow = getNativeShadow(startNode)))
    contexts.push(nativeHostShadow);
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
      const mightBeSlotted = path[j];
      const mightBeHost = path[j + 1];
      const slot = mightBeSlotted.assignedSlot;
      const shadow = mightBeHost.shadowRoot;
      if (slot && shadow) {
        const slotMatroschka = bounceSequenceImpl(slot, shadow, true);
        if (!slotted) {                             //we set the parentIndex from the host node contexts
          slotMatroschka[0].parent = i;
          for (let k = 1; k < slotMatroschka.length; k++)
            slotMatroschka[k].parent = contexts.length + k - 1;
        }
        contexts = [...contexts, ...slotMatroschka];
      } else {
        const nativeSlottingContext = getNativeShadowSlotOnly(mightBeHost);
        if (nativeSlottingContext)
          contexts = [...contexts, nativeSlottingContext];
      }
    }
  }
  return contexts;
}

function rootNodeIsCorrect(path, root) {
  return path.every(el => root === window ? el === window || el === document || el.getRootNode() === document : el.getRootNode() === root);
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
  return bouncedPath.map(({root, host, path, depth, slotted}) =>
    (slotted ? 's: ' : 'h: ') +
    Array(depth).fill('  ').join('') +
    (host? host.nodeName : root.host ? root.host.nodeName : 'window') + ': ' +
    path.map(et => et.nodeName || 'window')
  );
}