// export function bounceSequence(startNode, endDocumentWindow, slotted = false) {
//   let contexts = [];
//   for (let t = startNode; t; t = t.host) {
//     const path = [];
//     for (; t; t = t.parentNode)
//       path.push(t);
//     t = path[path.length - 1];
//     t === document && path.push(t = window);
//     contexts.unshift({root: t, path, slotted});
//     if (t === endDocumentWindow)
//       break;
//   }
//   if (!slotted)                                     //we set the parentIndex from the host node contexts
//     for (let i = 0; i < contexts.length; i++)
//       contexts[i].parent = i - 1;
//   for (let i = contexts.length - 1; i >= 0; i--) {
//     const {path} = contexts[i];
//     for (let j = 0; j < path.length - 1; j++) {
//       const slot = path[j].assignedSlot;
//       if (slot) {
//         const slotMatroschka = bounceSequence(slot, path[j + 1].shadowRoot, true);
//         if (!slotted) {                             //we set the parentIndex from the host node contexts
//           slotMatroschka[0].parent = i;
//           for (let k = 1; k < slotMatroschka.length; k++)
//             slotMatroschka[k].parent = contexts.length + k - 1;
//         }
//         contexts = [...contexts, ...slotMatroschka];
//       }
//     }
//   }
//   return contexts;
// }
//
// export function verifyBounceSequenceArguments(target, root) {
//   if (!(target instanceof EventTarget))
//     throw new Error('IllegalArgumentType: the "target" in bounceSequence(target, ...) must be an EventTarget.');
//   //todo the root is interpreted as a Boolean if it is neither document, window, nor a DocumentFragment.
//   if (!(root instanceof DocumentFragment || root instanceof Window || root === true || root === false))
//     throw new Error('IllegalArgumentType: the "root" in bounceSequence(target, root) must be either true (as in composed: true), false (as in composed: false), or a DocumentFragment, document, or window.');
// }

export function* PathIterator(path, phase) {
  if (phase === 1) {
    for (let i = path.length - 1; i > 0; i--)
      yield path[i];
  } else if (phase === 2) {
    yield path[0];
  } else if (phase === 3) {
    for (let i = 1; i < path.length; i++)
      yield path[i];
  }
}

export function* ContextIterator(context, parent) {
  context.parent = parent;
  yield context;
  for (let child of context.contexts.filter(c => c)) {
    for (let descendant of ContextIterator(child, context))
      yield descendant;
  }
}

export function composedPath(target, endDocumentOrWindowOrComposedTrueFalse) {
  const res = [];
  while (target) {
    res.push(target);
    target = target === endDocumentOrWindowOrComposedTrueFalse ? null :
      target === document ? window :
        target.assignedSlot || target.parentNode || (endDocumentOrWindowOrComposedTrueFalse ? target.host : null);
  }
  return res;
}

export function getPropagationRoot(target, event) {
  if (target === window) return window;
  const root = target.getRootNode(event);
  return root === document ? window : root;
}

//rule 1: The Bounce sequence always ends with a DocumentFragment, document, or window.
export function bounceSequence(target, endDocumentWindowTrueOrFalse, targetContext) {
  const path = [], contexts = targetContext ? [targetContext] : [];
  for (let t = target; t; t = t.parentNode)
    path.push(t);
  for (let i = 0; i < path.length - 2; i++) {  //-1 => document, -2 => topMost element
    const slot = path[i].assignedSlot;
    if (slot)
      contexts[i + 1] = bounceSequence(slot, path[i + 1].shadowRoot, undefined);
  }
  let root = path[path.length - 1];
  if (root === endDocumentWindowTrueOrFalse)                       //check for document as root.
    return {path, contexts, target, root};
  if (root === document) {
    path.push(root = window);                                      //window is always last.
    return {path, contexts, target, root};
  }
  // if (root === document)
  //   return {path: [window], contexts: [{path, contexts, target, root}], root: window, target: window};
  if (!endDocumentWindowTrueOrFalse || !(root instanceof DocumentFragment) || !root.host)
    return {path, contexts, target, root};
  return bounceSequence(root.host, endDocumentWindowTrueOrFalse, {path, contexts, target, root});
}

export function toString(context, depth = '', i = 0) {
  let {path, contexts} = context;
  path = depth + i + ':' + path.map(et => et.nodeName || 'window').join(',');
  contexts = contexts.map((c, i) => c ? toString(c, depth + '..', i) : null).filter(a => a);
  return [path, ...contexts.flat()];
}

export function contextForElement(context, el) {
  if (context.path.includes(el))
    return context;
  for (let child of context.contexts.filter(c => c)) {
    const res = contextForElement(child, el);
    if (res) return res;
  }
}

export function* SubsequentSiblingContexts(context) {
  if (!context.parent) return;
  const siblings = context.parent.contexts;
  for (let i = siblings.indexOf(context) + 1; i < siblings.length; i++)
    if (siblings[i])
      yield siblings[i];
}