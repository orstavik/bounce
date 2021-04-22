// The Naive, simplistic approach is this:
// 1. get the parentNode
// 2. make a childList mutation observer on the parent
// 3. every time the childList of the parent changes, if the childTarget is still a child, then nothing has happened in the eyes of the child.
// 4. but when the childTarget has changed, then
//    1. update the parentNode against which future changes will be checked against.
//    2. update the mutationObserver so that it observes the new parentNode and not the old one.
//    3. then call cb, with the target and the previousParentNode as arguments.

export function MutationObserverParentNodeNaive(childTarget, cb) {
  let wasParentNode = childTarget.parentNode;
  const observer = new MutationObserver(function () {
    if (childTarget.parentNode === wasParentNode)
      return;
    const previousParentNode = wasParentNode;
    wasParentNode = childTarget.parentNode;
    observer.observe(childTarget.parentNode, {childList: true});
    cb(childTarget, previousParentNode);
  });
  observer.observe(wasParentNode, {childList: true});
  return observer;
}

// the naive approach works, but it has a drawback:
// What if the parentNode is null? at the beginning or at a later stage?
// When the parentNode is null, then we have no target for our childList observer.
// Which is an oxymoron for our solution for observing parentNode.

export function MutationObserverParentNode(childTarget, cb) {
  if (!childTarget.parentNode)                                                                                     //*
    throw new Error('MutationObserverParentNode *only* works when the childTarget is attached to a parentNode.');  //*
  let wasParentNode = childTarget.parentNode;
  const observer = new MutationObserver(function () {
    if (childTarget.parentNode === wasParentNode)
      return;
    const previousParentNode = wasParentNode;
    wasParentNode = childTarget.parentNode;
    !wasParentNode ?                                                                                               //*
      observer.disconnect() :                                                                                      //*
      observer.observe(wasParentNode, {childList: true});
    cb(childTarget, previousParentNode);
  });
  observer.observe(wasParentNode, {childList: true});
  return observer;
}

//we can fix the issue of observing when null, by monkeyPatching appendChild and prepend and
// all the other js methods that allow us to add a node to the dom. Then we must check if the node being added IS
// one of the loose parentNode observing child targets. Nice! this will be good.

const orphanRestarters = new WeakMap();
const prependOG = Element.prototype.prepend;
function prepend(node) {
  const res = prependOG.call(this, node);
  orphanRestarters.get(node)?.call();
  return res;
}
Object.defineProperty(Element.prototype, 'prepend', {value: prepend, configurable: true});

export function MutationObserverParentNodeNullSafe(child, cb) {
  let parent = null;

  function start() {
    parent = child.parentNode;
    if (parent) {
      orphanRestarters.delete(child);
      observer.observe(parent, {childList: true});
    } else {
      observer.disconnect();
      orphanRestarters.set(child, restart);
    }
  }

  function restart() {
    const oldParent = parent;
    start();
    cb(child, oldParent);
  }

  const observer = new MutationObserver(function (ml) {
    child.parentNode !== parent && restart();
  });

  start();
  return {
    disconnect: function () {
      MutationObserver.prototype.disconnect.call(observer);
      orphanRestarters.delete(child);
    }
  };
}