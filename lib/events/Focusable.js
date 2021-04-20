import {definePseudoAttribute} from "../platform/PseudoAttributes.js";

//1. register focus and focus-within as pseudo-attributes.
function focusPseudoAttribute(el) {
  el instanceof Focusable ? el.focus() : el.removeAttribute('focus', focusPseudoAttribute);
}

definePseudoAttribute('focus', focusPseudoAttribute);

function focusWithinPseudoAttribute(el) {
  !el.focusWithin && el.removeAttribute('focus-within', focusWithinPseudoAttribute);
}

definePseudoAttribute('focus-within', focusWithinPseudoAttribute);

function removeAttributesInDocument(el) {
  el.removeAttribute('focus', focusPseudoAttribute);
  for (; el instanceof HTMLElement; el = el.parentNode)
    el.removeAttribute('focus-within', focusWithinPseudoAttribute);
}

function setFocusInDocument(el) {
  el.setAttribute('focus', '', focusPseudoAttribute);
  for (; el instanceof HTMLElement; el = el.parentNode)
    el.setAttribute('focus-within', '', focusWithinPseudoAttribute);
}

//2. register which element has focus in each document.
function targetRoots(target) {
  const res = [];
  for (let root = target.getRootNode(); root && root instanceof DocumentFragment || root === document; target = root.host, target?.getRootNode())
    res.push({target, root});
  return res;
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
    removeAttributesInDocument(el);
  }
}

function focusInState(newTargetRoots) {
  for (let {root, el} of newTargetRoots) {
    cache.set(root, el);
    setFocusInDocument(el);
  }
}

function getFocusWithin() {
  return cache.has(this);
}

Object.defineProperty(Document.prototype, 'focusWithin', {get: getFocusWithin});
Object.defineProperty(DocumentFragment.prototype, 'focusWithin', {get: getFocusWithin});
//todo lock the document.activeElement too??


//3. the mixin that controls the event listeners on focusable elements
function onMousedown(e) {
  if (!e.isTrusted || !(e.button === 0 || e.button === 1) || this === this.getRootNode().focusWithin)
    return;
  e.preventDefault();
  this.focus();
}

export function focusable(el) {
  el.shadowRoot.addEventListener('mousedown', onMousedown, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
}

export function Focusable(Base) {
  return class Focusable extends Base {
    constructor() {
      super();
      // todo should we let this work from the pseudo-attributes patch?? probably yes.
      // document.readyState === 'loading' ?
      //   Promise.resolve().then(() => Promise.resolve().then(() => focusable(this))) :
      focusable(this);
    }

    focus() {
      const oldInFocus = document.activeElement;
      const oldTargetRoots = targetRoots(oldInFocus);
      const newTargetRoots = targetRoots(this);
      stripIdentical(newTargetRoots, oldTargetRoots);
      const root = newTargetRoots[newTargetRoots.length - 1].root; //same for both out and in events
      //the focus events run as macro-tasks. There is a special case that focus and focusin run as one unit when triggered from script,
      //this edge case is not worked with here.
      setTimeout(() => {
        document.activeElement = document.body;
        focusOutState(oldTargetRoots);
        const blur = new FocusEvent('blur', {composed: true, bubbles: false, relatedTarget: this});
        oldInFocus.dispatchEvent(blur, {root});
      });
      setTimeout(() => {
        const focusout = new FocusEvent('focusout', {composed: true, bubbles: true, relatedTarget: this});
        oldInFocus.dispatchEvent(focusout, {root});
      });
      setTimeout(() => {
        document.activeElement = this;
        focusInState(newTargetRoots);
        const focus = new FocusEvent('focus', {composed: true, bubbles: false, relatedTarget: oldInFocus});
        this.dispatchEvent(focus, {root});
      });
      setTimeout(() => {
        const focusIn = new FocusEvent('focusin', {composed: true, bubbles: true, relatedTarget: oldInFocus});
        this.dispatchEvent(focusIn, {root});
      });
    }
  }
}