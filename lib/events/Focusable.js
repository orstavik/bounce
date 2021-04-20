//1. register focus and focus-within as pseudo-attributes.
function filterFocusAttributes(name) {
  if (name === 'focus-within')
    throw new Error(`PseudoAttributeError: 'focus-within' is a protected pseudo attribute name. 'focus-within' can only be set by the Focusable mixin, from within the focusable element itself.`);
  if (name === 'focus' && !(this instanceof Focusable))
    throw new Error(`PseudoAttribute: 'focus' is a protected pseudo attribute name. 'focus' can only be set on 'Focusable' Elements.`);
}

const setAttributeOG = Element.prototype.setAttribute;
Element.prototype.setAttribute = function (name, value) {
  filterFocusAttributes(name);
  return setAttributeOG.call(this, name, value);
};

const removeAttributeOG = Element.prototype.removeAttribute;
Element.prototype.removeAttribute = function (name) {
  filterFocusAttributes(name);
  return removeAttributeOG.call(this, name);
};

//2. register which element has focus in each document.
function targetRoots(target) {
  const res = [];
  for (let root = target.getRootNode(); root && root instanceof DocumentFragment || root === document; target = root.host, target?.getRootNode())
    res.push({target, root});
  return res;
}

function* andParentElements(el) {
  for (; el instanceof Element; el = el.parentNode)
    yield el;
}

function stripIdentical(newTargetRoots, oldTargetRoots) {
  while (newTargetRoots.length && oldTargetRoots.length) {
    let lastNew = newTargetRoots[newTargetRoots.length - 1];
    let lastOld = oldTargetRoots[oldTargetRoots.length - 1];
    if (lastNew.target !== lastOld.target)
      return;
    newTargetRoots.pop();
    oldTargetRoots.pop();
  }
}

const cache = new WeakMap();

function focusOutState(oldTargetRoots) {
  for (let {root, el} of oldTargetRoots) {
    cache.delete(root);
    removeAttributeOG.call(el, 'focus');
    for (let parent of andParentElements(el))
      removeAttributeOG.call(el, 'focus-within');
  }
}

function focusInState(newTargetRoots) {
  for (let {root, el} of newTargetRoots) {
    cache.set(root, el);
    setAttributeOG.call(el, 'focus', '');
    for (let parent of andParentElements(el))
      setAttributeOG.call(el, 'focus-within', '');
  }
}

function getFocusWithin() {
  return cache.has(this);
}

Object.defineProperty(Document.prototype, 'focusWithin', {get: getFocusWithin});
Object.defineProperty(DocumentFragment.prototype, 'focusWithin', {get: getFocusWithin});
Object.defineProperty(Document.prototype, 'activeElement', {
  get: function () {     //todo override document.activeElement
  }, set: function () {
  }
});


function doFocus(newInFocus) {
  const oldInFocus = document.activeElement;
  const oldTargetRoots = targetRoots(oldInFocus);
  const newTargetRoots = targetRoots(newInFocus);
  stripIdentical(newTargetRoots, oldTargetRoots);
  const root = newTargetRoots[newTargetRoots.length - 1].root; //same for both out and in events
  //the focus events run as macro-tasks. There is a special case that focus and focusin run as one unit when triggered from script,
  //this edge case is not worked with here.
  setTimeout(() => {
    document.activeElement = document.body;                     //
    focusOutState(oldTargetRoots);
    const blur = new FocusEvent('blur', {composed: true, bubbles: false, relatedTarget: newInFocus});
    oldInFocus.dispatchEvent(blur, {root});
  });
  setTimeout(() => {
    const focusout = new FocusEvent('focusout', {composed: true, bubbles: true, relatedTarget: newInFocus});
    oldInFocus.dispatchEvent(focusout, {root});
  });
  setTimeout(() => {
    document.activeElement = newInFocus;
    focusInState(newTargetRoots);
    const focus = new FocusEvent('focus', {composed: true, bubbles: false, relatedTarget: oldInFocus});
    newInFocus.dispatchEvent(focus, {root});
  });
  setTimeout(() => {
    const focusIn = new FocusEvent('focusin', {composed: true, bubbles: true, relatedTarget: oldInFocus});
    newInFocus.dispatchEvent(focusIn, {root});
  });
}

//3. the mixin that controls the event listeners on focusable elements
function onMousedown(e) {
  if (!e.isTrusted || !(e.button === 0 || e.button === 1) || this.hasAttribute('focus'))
    return;
  e.preventDefault();
  this.focus();
}

function attributeChangedCallback(mutationList) {
  for (let mutation of mutationList) {
    const att = mutation.attributeName;
    att === 'focus' && mutation.target.focus();
  }
}

export function focusable(el) {
  el.shadowRoot.addEventListener('mousedown', onMousedown, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
  const observer = new MutationObserver(attributeChangedCallback);
  observer.observe(el, {attributes: true});
}

export function Focusable(Base) {
  return class Focusable extends Base {
    constructor() {
      super();
      // todo should we let this work from the pseudo-attributes patch?? probably yes.
      document.readyState !== 'ready' ?
        //window.addEventListener('DOMContentLoaded', ()=>focusable(this)): //todo is this better than 2xPRT??
        Promise.resolve().then(() => Promise.resolve().then(() => focusable(this))) :
        focusable(this);
    }

    focus() {
      !this.hasAttribute('focus') && this.setAttribute('focus', '');
    }
  }
}