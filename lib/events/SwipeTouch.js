window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});
const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

let supportsPassive = false;
try {
  const opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassive = true;
    }
  });
  window.addEventListener("test", null, opts);
  window.removeEventListener("test", null, opts);
} catch (e) {
}

const options = {
  preventable: EventListenerOptions.PREVENTABLE_SOFT,
  trustedOnly: true,
  capture: true,
}

if (supportsPassive)
  options.passive = false;


function captureEvent(e, stopProp) {
  e.preventDefault();
  stopProp && e.stopImmediatePropagation ? e.stopImmediatePropagation() : e.stopPropagation();
}

function filterOnAttribute(e, attributeName) {
  for (let el = e.target; el; el = el.parentNode) {
    if (!el.hasAttribute) return null;
    if (el.hasAttribute(attributeName)) return el;
  }
  return null;
}

function replaceDefaultAction(target, composedEvent, trigger) {      //[3] ReplaceDefaultAction
  composedEvent.trigger = trigger;
  trigger.stopTrailingEvent = function () {
    composedEvent.stopImmediatePropagation ? composedEvent.stopImmediatePropagation() : composedEvent.stopPropagation();
  };
  trigger.preventDefault();
  return setTimeout(function () {
    target.dispatchEvent(composedEvent)
  }, 0);
}

function makeSwipeEvent(name, trigger) {
  const composedEvent = new CustomEvent("swipe-" + name, {
    bubbles: true,
    composed: true,
  });
  composedEvent.x = trigger.changedTouches ? parseInt(trigger.changedTouches[0].clientX) : trigger.x;
  composedEvent.y = trigger.changedTouches ? parseInt(trigger.changedTouches[0].clientY) : trigger.y;
  return composedEvent;
}

let globalSequence;

const touchInitialListener = e => onTouchInitial(e);
const touchdownSecondaryListener = e => onTouchdownSecondary(e);
const touchmoveListener = e => onTouchmove(e);
const touchendListener = e => onTouchend(e);
const onBlurListener = e => onBlur(e);
const onSelectstartListener = e => onSelectstart(e);

function startSequence(target, e) {                                                            //5. Event Sequence
  const body = document.querySelector("body");
  const sequence = {
    target,
    cancelTouchout: target.hasAttribute("swipe-cancel-pointerout"),
    swipeDuration: parseInt(target.getAttribute("pointer-duration")) || 50,                    //6. EventAttribute
    swipeDistance: parseInt(target.getAttribute("pointer-distance")) || 100,
    recorded: [e],
    userSelectStart: body.style.userSelect,                                                    //10. Grabtouch
    touchActionStart: body.style.touchAction,
  };
  document.children[0].style.userSelect = "none";
  document.children[0].style.touchAction = "none";
  // Call attributeChangedCallback on each eventTranslator class to ADD listeners
  target.setAttributeNode(document.createAttribute("start-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  return sequence;
}

function updateSequence(sequence, e) {                                                         //7. TakeNote
  sequence.recorded.push(e);
  return sequence;
}

function stopSequence(target) {
  document.children[0].style.userSelect = globalSequence.userSelectStart;
  document.children[0].style.touchAction = globalSequence.touchActionStart;
  // Call attributeChangedCallback on each eventTranslator class to REMOVE listeners
  target.setAttributeNode(document.createAttribute("stop-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  return undefined;
}

function onTouchInitial(trigger) {
  if (trigger.defaultPrevented)
    return;
  if (trigger.touches.length !== 1)           //support sloppy finger
    return;
  const target = filterOnAttribute(trigger, "swipe");
  if (!target)
    return;
  const composedEvent = makeSwipeEvent("start", trigger);
  captureEvent(trigger, false);
  globalSequence = startSequence(target, composedEvent);
  replaceDefaultAction(target, composedEvent, trigger);
}

function onTouchdownSecondary(trigger) {
  const cancelEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, cancelEvent, trigger);
}

function onTouchmove(trigger) {
  const composedEvent = makeSwipeEvent("move", trigger);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onTouchend(trigger) {
  trigger.preventDefault();
  const stopEvent = makeSwipeEvent("stop", trigger);
  if (!stopEvent) return;
  captureEvent(trigger, false);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, stopEvent, trigger);
}

function onBlur(trigger) {
  const blurInEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, blurInEvent, trigger);
}

function onSelectstart(trigger) {
  trigger.preventDefault();
  trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
}

export class touchStartToSwipeStart extends HTMLElement {

  // initial touchstart listener
  firstConnectedCallback() {
    this.addEventListener('touchstart', touchInitialListener, options);
  }

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence") // remove initial event listener after start sequence
      this.removeEventListener('touchstart', touchInitialListener, options);
    else  //add new initial touchstart listener when sequence ends
      this.addEventListener('touchstart', touchInitialListener, options);
  }
}

export class touchMoveToSwipeMove extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchmove', touchmoveListener, options);
    else
      this.removeEventListener('touchmove', touchmoveListener, options);
  }
}

export class touchEndToSwipeStop extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchend', touchendListener, options);
    else
      this.removeEventListener('touchend', touchendListener, options);
  }
}

export class blurToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('blur', onBlurListener, options);
    else
      this.removeEventListener('blur', onBlurListener, options);
  }
}

export class selectStart extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('selectstart', onSelectstartListener, options);
    else
      this.removeEventListener('selectstart', onSelectstartListener, options);
  }
}

export class touchStartToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchstart', touchdownSecondaryListener, options);
    else
      this.removeEventListener('touchstart', touchdownSecondaryListener, options);
  }
}
