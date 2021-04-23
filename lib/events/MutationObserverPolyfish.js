// to avoid monkey patching the native appendChild functions individually, we need to use one parentNode observer for all instances.
// this is not that difficult now.

const orphanRestarters = new WeakMap();
const childToCbs = new WeakMap();
const childToDisconnects = new WeakMap();

const appendChildOG = Element.prototype.appendChild;
Element.prototype.appendChild = function appendChild(node) {
  const res = appendChildOG.call(this, node);
  orphanRestarters.get(node)?.call();
  return res;
};
const insertBeforeOG = Element.prototype.insertBefore;
Element.prototype.insertBefore = function insertBefore(node) {
  const res = insertBeforeOG.call(this, node);
  orphanRestarters.get(node)?.call();
  return res;
};
const appendOG = Element.prototype.append;
Element.prototype.append = function append(node) {
  const res = appendOG.call(this, node);
  orphanRestarters.get(node)?.call();
  return res;
};
const prependOG = Element.prototype.prepend;
Object.defineProperty(Element.prototype, 'prepend', {
  value: function prepend(node) {
    const res = prependOG.call(this, node);
    orphanRestarters.get(node)?.call();
    return res;
  },
  configurable: true
});
const DocumentFragmentAppendOG = DocumentFragment.prototype.append;
DocumentFragment.prototype.append = function append(...nodes) {
  DocumentFragmentAppendOG.call(this, ...nodes);
  for (let node of nodes)
    orphanRestarters.get(node)?.call();
};
const DocumentFragmentPrependOG = DocumentFragment.prototype.prepend;
DocumentFragment.prototype.prepend = function prepend(...nodes) {
  DocumentFragmentPrependOG.call(this, ...nodes);
  for (let node of nodes)
    orphanRestarters.get(node)?.call();
};

export function MutationObserverParentNodeNullSafeEfficient(child, cb) {
  const previousCbs = childToCbs.get(child);
  if (previousCbs) {
    previousCbs.push(cb);
    return childToDisconnects.get(child);
  }
  childToCbs.set(child, [cb]);

  let parent = null;

  function start() {
    parent = child.parentNode;
    if (parent) {
      orphanRestarters.delete(child);
      observer.observe(parent, {childList: true});
    } else {
      orphanRestarters.set(child, restart);
    }
  }

  function restart() {
    const oldParent = parent;
    start();
    for (let cb of childToCbs.get(child))
      cb(child, oldParent);
  }

  const observer = new MutationObserver(function () {
    child.parentNode !== parent && restart();
  });

  start();
  const result = {
    disconnect: function (cb) {
      const cbs = childToCbs.get(child);
      cbs.splice(cbs.indexOf(cb), 1);
      if (cbs.length)
        return;
      childToCbs.delete(child);
      orphanRestarters.delete(child);
      MutationObserver.prototype.disconnect.call(observer);
    }
  };
  childToDisconnects.set(child, result);
  return result;
}

function path(n) {
  const res = [];
  for (; n; n = n.parentNode)
    res.push(n);
  return res;
}

function diffPaths(oldPath, newPath) {
  return {
    added: newPath.filter(el => !oldPath.includes(el)),
    removed : oldPath.filter(el => !newPath.includes(el))
  };
}

export function MutationObserverPath(target, cb) {

  function removeObservers(targets) {
    targets.forEach(t => (observers.get(t).disconnect(), observers.delete(t)));
  }

  function addObservers(targets) {
    for (let i = 0; i < targets.length - 1; i++) { //-1 => skip document
      const t = targets[i];
      observers.set(t, MutationObserverParentNodeNullSafeEfficient(t, wrapper))
    }
  }

  function wrapper(/*child, oldParent*/) {
    const oldPath = localPath;
    localPath = path(target);
    const {added, removed} = diffPaths(oldPath, localPath);
    if (!added.length && !removed.length)
      return;
    removeObservers(removed);
    addObservers(added);
    cb(localPath, oldPath, added, removed);
  }

  let localPath = path(n);
  let observers = addObservers(localPath);
  return {
    disconnect: function () {
      removeObservers(localPath);
    }
  }
}