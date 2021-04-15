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
        const slotMatroschka = bounceSequence(slot, path[j + 1].shadowRoot, true);
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