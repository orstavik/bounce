//focusElements
let focusElements = [];

function getFocusElement() {
  return focusElements.find(el => el.getRootNode() === this) || null;
}

Object.defineProperty(DocumentFragment.prototype, 'focusElement', {get: getFocusElement});
Object.defineProperty(Document.prototype, 'focusElement', {get: getFocusElement});

function getActiveElement() {
  return focusElements[focusElements.length - 1] || null;
}

const setActiveElementOG = Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement').get;
Object.defineProperty(Document.prototype, 'activeElement', {get: getActiveElement});

function focusWithin() {
  return this.contains(this.getRootNode().focusElement);
}

Object.defineProperty(Element.prototype, 'focusWithin', {get: focusWithin});

function targetChain(el) {
  const res = [el];
  let host;
  while (host = el.getRootNode()?.host)
    res.push(host);
  return res;
}

function shiftFocus(focusTarget) {
  const inFocusElements = Array.from(andHostElements(focusTarget));
  const lostFocus = focusElements.filter(el => !inFocusElements.includes(el));
  const gainedFocus = inFocusElements.filter(el => !focusElements.includes(el));
  //the focus events run as macro-tasks. There is a special case that focus and focusin run as one unit when triggered from script,
  //this edge case is not worked with here.
  const blurTarget = lostFocus[0], blurRoot = lostFocus[lostFocus.length - 1];
  const focusRoot = gainedFocus[gainedFocus.length - 1];
  setTimeout(() => {
    focusElements = [document.body];    //todo this is just plain wrong.. we shouldn't wait until we add focus to set this.
    // HTMLElement.prototype.focus.call(document.body); //this is not really necessary at this point, because no keyboard events will run in the mean time..
    for (let target of lostFocus) {
      removeAttributeOG.call(target, 'focus');
      for (let parent of andParentElements(target))
        removeAttributeOG.call(target, 'focus-within');
    }
    const blur = new FocusEvent('blur', {composed: true, bubbles: false, relatedTarget: focusTarget});
    blurTarget.dispatchEvent(blur, {root: blurRoot});
  });
  setTimeout(() => {
    const focusout = new FocusEvent('focusout', {composed: true, bubbles: true, relatedTarget: focusTarget});
    blurTarget.dispatchEvent(focusout, {root: blurRoot});
  });
  setTimeout(() => {
    focusElements = inFocusElements;
    HTMLElement.prototype.focus.call(focusTarget);       //todo we need to block the native focus events dispatched by this call..
    for (let target of gainedFocus) {
      setAttributeOG.call(target, 'focus', '');
      for (let parent of andParentElements(target))
        setAttributeOG.call(target, 'focus-within', '');
    }
    const focus = new FocusEvent('focus', {composed: true, bubbles: false, relatedTarget: blurTarget});
    focusTarget.dispatchEvent(focus, {root: focusRoot});
  });
  setTimeout(() => {
    const focusIn = new FocusEvent('focusin', {composed: true, bubbles: true, relatedTarget: blurTarget});
    focusTarget.dispatchEvent(focusIn, {root: focusRoot});
  });
}

//PseudoAttribute pattern
function filterFocusAttributes(name) {
  if (name === 'focus-within' || name === 'focus')
    throw new Error(`PseudoAttributeError: '${name}' is a protected pseudo attribute name. '${name}' that can only be set by Focusable Elements themselves on themselves.`);
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

function writeProtect(el, attName, shouldHave) {
  if (shouldHave && !el.hasAttribute(attName))
    setAttributeOG.call(el, attName, '');
  else if (!shouldHave && el.hasAttribute(attName))
    removeAttributeOG.call(el, attName);
}

function attributeChangedCallback(mutationList) {
  for (let mutation of mutationList) {
    const att = mutation.attributeName;
    const el = mutation.target;
    if (att === 'focus')
      writeProtect(el, 'focus', el.getRootNode().focusWithin === el);
    else if (att === 'focus-within')
      writeProtect(el, 'focus-within', el.contains(el.getRootNode().focusWithin));
  }
}

//PseudoAttribute pattern


//2. register which element has focus in each document.
function targetRoots(target) {
  const res = [];
  for (let root = target.getRootNode(); root && root instanceof DocumentFragment || root === document; target = root.host, target?.getRootNode())
    res.push({target, root});
  return res;
}

function hostTargets(innerTarget) {
  const res = [innerTarget];
  for (let parent = innerTarget.getRootNode(); parent.host; parent = parent.host.getRootNode())
    res.push(parent);
  return res;
}

function* andParentElements(el) {
  for (; el instanceof Element; el = el.parentNode)
    yield el;
}

function* andHostElements(el) {
  for (; el; el = el.getRootNode()?.host)
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

function doFocus(newInFocus) {
  const oldInFocus = document.activeElement;
  const oldTargetRoots = targetRoots(oldInFocus);
  const newTargetRoots = targetRoots(newInFocus);
  stripIdentical(newTargetRoots, oldTargetRoots);
  const root = newTargetRoots[newTargetRoots.length - 1].root; //same for both out and in events
  //the focus events run as macro-tasks. There is a special case that focus and focusin run as one unit when triggered from script,
  //this edge case is not worked with here.
  setTimeout(() => {
    HTMLElement.prototype.focus.call(document.body); //todo this is not really necessary anymore.
    for (let target of oldTargetRoots) {
      removeAttributeOG.call(target, 'focus');
      for (let parent of andParentElements(target))
        removeAttributeOG.call(target, 'focus-within');
    }
    const blur = new FocusEvent('blur', {composed: true, bubbles: false, relatedTarget: newInFocus});
    oldInFocus.dispatchEvent(blur, {root});
  });
  setTimeout(() => {
    const focusout = new FocusEvent('focusout', {composed: true, bubbles: true, relatedTarget: newInFocus});
    oldInFocus.dispatchEvent(focusout, {root});
  });
  setTimeout(() => {
    HTMLElement.prototype.focus.call(focusTarget); //this will cause a lot of native events to occur.
    for (let target of newTargetRoots) {
      setAttributeOG.call(target, 'focus', '');
      for (let parent of andParentElements(target))
        setAttributeOG.call(target, 'focus-within', '');
    }
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


export function focusable(el) {
  el.shadowRoot.addEventListener('mousedown', onMousedown, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
  const observer = new MutationObserver(attributeChangedCallback);
  observer.observe(el, {attributes: true, attributeFilter: ['focus', 'focus-within']});
}

export function Focusable(Base) {
  return class Focusable extends Base {
    constructor() {
      super();
      // todo should we let this work from the pseudo-attributes patch?? probably yes.
      // document.readyState !== 'ready' ?
      //window.addEventListener('DOMContentLoaded', ()=>focusable(this)): //todo is this better than 2xPRT??
      // Promise.resolve().then(() => Promise.resolve().then(() => focusable(this))) :
      //todo we want to set this *before* the attribute is registered.
      focusable(this);
    }

    focus() {
      !this.hasAttribute('focus') && setAttributeOG.call(this, 'focus', '');
    }
  }
}