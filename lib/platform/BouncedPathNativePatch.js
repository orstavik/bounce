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
  return bounceSequenceImpl(target, root, -1, false);
}

const aSlot = document.createElement('slot');
const aShadow = new DocumentFragment();
const slotContext = {root: aShadow, path: [aSlot, aShadow]};
const noSlotContext = {root: aShadow, path: [aShadow]};
const nativeSlotHosts = ['A', 'DETAILS'];

//add the host here, because we need this when the default action runs. we need to check for attributes that turn on/off default action listeners..
//the native elements has attribute observers that add/remove preventable event listeners depending on state.
function getNativeShadow(hostTag, parent, host) {
  return nativeSlotHosts.includes(hostTag) ?
    Object.assign({host, parent, hostTag}, slotContext) :
    hostTag && hostTag.indexOf('-') < 0 && Object.assign({host, parent, hostTag}, noSlotContext);
}

//add the host here, because we need this when the default action runs. we check for default action ..
function getNativeShadowSlotOnly(hostTag, parent, host) {
  return nativeSlotHosts.includes(hostTag) && Object.assign({host, parent, hostTag, slot: true}, slotContext);
}

function bounceSequenceImpl(startNode, endDocumentWindow, parent, slot) {
  const nativeHostShadow = getNativeShadow(startNode.tagName, null);
  let contexts = nativeHostShadow ? [nativeHostShadow] : [];
  for (let t = startNode; t; t = t.host) {
    const path = [];
    for (; t; t = t.parentNode)
      path.push(t);
    t = path[path.length - 1];
    t === document && path.push(t = window);
    contexts.unshift({root: t, path, slot, parent});
    if (t === endDocumentWindow)
      break;
  }
  for (let i = 1; i < contexts.length; i++)   //setting parent index for top level. slotted contexts should only be one level deep.
    contexts[i].parent = i - 1;
  for (let i = contexts.length - 1; i >= 0; i--) {
    const {path} = contexts[i];
    for (let j = 0; j < path.length - 1; j++) {
      const mightBeSlotted = path[j];
      const mightBeHost = path[j + 1];
      const slot = mightBeSlotted.assignedSlot;
      const shadow = mightBeHost.shadowRoot;
      if (slot && shadow)
        contexts = [...contexts, ...(bounceSequenceImpl(slot, shadow, i, true))];
      else {
        const nativeSlottingContext = getNativeShadowSlotOnly(mightBeHost.tagName, i);
        if (nativeSlottingContext)
          contexts = [...contexts, nativeSlottingContext];
      }
    }
  }
  return contexts;
}

function getDepth(depths, root, parent) {
  const depth = depths.get(root);
  if (depth !== undefined)
    return depth
  const parentDepth = depths.get(parent);
  if (parentDepth === undefined)
    throw new Error('BouncedPathBug 1: A UseD document is listed before its UseR document.');
  const depths2 = Array.from(depths.entries()).reverse();
  for (let [lastRoot, lastDepth] of depths2) {
    if (lastRoot === parent) break;
    if (lastDepth.length <= parentDepth.length)
      throw new Error('BouncedPathBug 2: Maybe sibling document listed before a nested document?');
  }
  return depths.set(root, parentDepth + '  '), depths.get(root);
}

function rootNodeIsCorrect(path, root) {
  return path.every(el => root === window ? el === window || el === document || el.getRootNode() === document : el.getRootNode() === root);
}

export function print(bouncedPath) {
  const depths = new Map([[undefined, '']]);
  if (!bouncedPath.every(({root, path}) => rootNodeIsCorrect(path, root)))
    throw new Error('BouncedPathBug: root node error.');
  return bouncedPath.map(({parent, root, path}) =>
    getDepth(depths, root, parent) +
    (root.host ? root.host.nodeName : 'window') + ': ' +
    path.map(et => et.nodeName || 'window')
  );
}