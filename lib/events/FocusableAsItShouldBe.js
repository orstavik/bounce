import {MutationObserverPath} from "./MutationObserverPolyfish.js";
export {removeRegisteredPseudoAttributes} from "../platform/PseudoAttributes.js";

//focusElements
//the :focus css pseudo class is realized as [\:focus] pseudo attribute
//the :focus-within pseudo class should be realized as :has([\:focus])
//blur and focus events are skipped.
//focusout and focusin run sync.
//the state in the DOM is updated before the focusout event.
//therefore, only focusin really needs a relatedTarget property.
//dynamic changes in the DOM is not observed, as there is no ascendant observer..

let activeElement = null;
let cachedFocusElements = [];
let cachedObservers = new WeakMap();

function getActiveElement() {
  return activeElement;
}

function* getFocusElements(el) {
  for (; el; el = el.getRootNode()?.host)
    yield el;
}

const passKey = Math.random() + 1;

Object.defineProperty(Document.prototype, 'activeElement', {get: getActiveElement});


function onMutation() {
  if(!activeElement.connected)
    activeElement = cachedFocusElements.find(el => el.connected) || document.body;
  updateFocus();
}

function updateFocus() {
  //1. calculate which elements have gained and lost focus.
  //   Keep cachedState such as lostFocus as closure variables to be used in event dispatch and event.relatedTargets.
  const inFocusElements = Array.from(getFocusElements(activeElement));
  const gainedFocus = inFocusElements.filter(el => !cachedFocusElements.includes(el));
  const lostFocus = cachedFocusElements.filter(el => !inFocusElements.includes(el));
  cachedFocusElements = inFocusElements;

  //2. update the state in the DOM and this mixin to reflect the new reality, asap.
  for (let el of lostFocus) {
    el.removeAttribute(':focus', passKey);
    cachedObservers.get(el).disconnect(onMutation);
  }
  for (let el of gainedFocus) {
    el.setAttributeNode(document.createAttribute(':focus'), passKey);
    cachedObservers.set(el, MutationObserverPath(el, onMutation));
  }
  if (!lostFocus.length && !gainedFocus.length)
    return;

  //3. when state is updated, dispatch events for lost and gained focus.
  const focusoutRoot = lostFocus[lostFocus.length - 1];
  const focusoutTarget = lostFocus[0];
  const focusout = new FocusEvent('focusout', {composed: true, bubbles: true});
  focusoutTarget.dispatchEvent(focusout, {root: focusoutRoot});
  //   relatedTarget is included to make life simpler (so you don't have to add an event listener for focusout to get the old targets).
  //   the problem is that the lostTarget could be deep inside another shadowRoot branch.
  //   don't know how to present the old state for most use case relevance.
  const focusinRoot = gainedFocus[gainedFocus.length - 1];
  const focusIn = new FocusEvent('focusin', {composed: true, bubbles: true, relatedTarget: focusoutTarget});
  activeElement.dispatchEvent(focusIn, {root: focusinRoot});
}

//3. the mixin that controls the event listeners on focusable elements
function onMousedown(e) {
  if (!e.isTrusted || !(e.button === 0 || e.button === 1) || this.hasAttribute('focus'))
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
      focusable(this);
    }

    focus() {
      activeElement = this;
      updateFocus();
    }
  }
}