function Slottables(newChildren, oldChildren) {
  return {
    newChildren, oldChildren,
    get added() {
      return newChildren.filter(el => !oldChildren.includes(el));
    },
    get removed() {
      return oldChildren.filter(el => !newChildren.includes(el));
    }
  };
}

function doCallback({target}) {
  // try {
  const oldChildren = previousChildren.get(target) || empty;
  const newChildren = target.children;
  previousChildren.set(target, newChildren);
  target.slotCallback(Slottables(newChildren, oldChildren));
  // } catch (error) {
  //todo do we really wish to catch this error?? maybe better to let the error be handled by the browsers native MutationObserver callback error?
  // window.dispatchEvent(new ErrorEvent('error', {error, message: 'Uncaught Error: slottablesCallback() break down'}));
  // }
}

const empty = Object.freeze([]);
const previousChildren = new WeakMap();
const observers = new WeakMap();

function setup(target) {
  const childObserver = new MutationObserver(mutationList => mutationList.forEach(doCallback));
  observers.set(target, childObserver);
  childObserver.observe(target, {childList: true});
  previousChildren.set(target, empty);
  doCallback(target);
}

function unsetup(target) {
  const childObserver = observers.get(target);
  childObserver.disconnect();
  observers.delete(target);
  previousChildren.delete(target);
}

let queue = new Set();
if (document.readyState === "loading") {
  document.addEventListener('DOMContentLoaded', function () {
    for (let el of queue)  //you must expect random order essentially, but that should be ok. You would like top down.
      setup(el);
    queue = undefined;
  });
}

export class SlotCallbackMixin {
  connectedCallback() {
    document.readyState === "loading" ? queue.add(this) : setup(this);
  }

  disconnectedCallback() {
    document.readyState === "loading" ? queue.delete(this) : unsetup(this);
  }
}