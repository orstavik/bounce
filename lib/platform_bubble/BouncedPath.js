export function* ContextIterator(context, parent) {
  context.parent = parent;
  yield context;
  for (let child of context.contextChildren.filter(c => c)) {
    for (let descendant of ContextIterator(child, context))
      yield descendant;
  }
}

export function composedPath(target, endDocumentOrComposedTrueFalse) {
  const res = [];
  while (target) {
    res.push(target);
    target = target.assignedSlot || target.parentNode || ((target !== endDocumentOrComposedTrueFalse || !endDocumentOrComposedTrueFalse) ? target.host : undefined);
  }
  return res;
}

//rule 1: The Bounce sequence always ends with a DocumentFragment or the document.
export function bounceSequence(target, endDocumentTrueOrFalse, contextChildren = []) {
  //1. make path
  const path = [];
  let root = target;
  for (let n = target; n; n = n.parentNode)
    path.push(root = n);
  //2. make slotted contextChildren
  for (let i = 0; i < path.length - 2; i++) {  //-1 => document, -2 => topMost element
    const slot = path[i].assignedSlot;
    if (slot)
      contextChildren[i + 1] = bounceSequence(slot, path[i + 1].shadowRoot, undefined);
  }
  const context = {target, root, path, contextChildren};
  //3. we have a local context. If the bounce sequence is at the top, then return, otherwise make the parent bounce context
  if (root === endDocumentTrueOrFalse || !endDocumentTrueOrFalse || !(root instanceof DocumentFragment) || !root.host)
    return context;
  return bounceSequence(root.host, endDocumentTrueOrFalse, [context]);
}

export function toString(context, depth = '', i = 0) {
  let {path, contextChildren} = context;
  path = depth + i + ':' + path.map(et => et.nodeName).join(',');
  contextChildren = contextChildren.map((c, i) => c ? toString(c, depth + '..', i) : null).filter(a => a);
  return [path, ...contextChildren.flat()];
}