// (function () {

window.EventListenerOptions = Object.assign(window.EventListenerOptions || {}, {
  PREVENTABLE_NONE: 0,   // the listener is not blocked by preventDefault, nor does it trigger preventDefault.     //this is the same as passive: true
  PREVENTABLE_SOFT: 1,   // the listener is blocked by preventDefault, and *may or may not* trigger preventDefault.
  PREVENTABLE: 2,        // the listener is blocked by preventDefault, and will always call preventDefault when invoked.
});
const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

const options = {
  preventable: EventListenerOptions.PREVENTABLE_SOFT,
  trustedOnly: true,
  capture: true
}

function captureEvent(e, stopProp) {
  e.preventDefault();
  stopProp && e.stopImmediatePropagation ? e.stopImmediatePropagation() : e.stopPropagation();
}

function filterOnAttribute(e, attributeName) {                                                 //4. FilterByAttribute
  for (let el = e.target; el; el = el.parentNode) {
    if (!el.hasAttribute)
      return null;
    if (el.hasAttribute(attributeName))
      return el;
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
  const composedEvent = new CustomEvent("swipe-" + name, {bubbles: true, composed: true});
  composedEvent.x = trigger.x;
  composedEvent.y = trigger.y;
  return composedEvent;
}

let globalSequence;
const mousedownInitialListener = e => onMousedownInitial(e);
const mousedownSecondaryListener = e => onMousedownSecondary(e);
const mousemoveListener = e => onMousemove(e);
const mouseupListener = e => onMouseup(e);
const onBlurListener = e => onBlur(e);
const onSelectstartListener = e => onSelectstart(e);


function startSequence(target, e) {                                                            //5. Event Sequence
  const body = document.querySelector("body");
  const sequence = {
    target,
    cancelMouseout: target.hasAttribute("swipe-cancel-pointerout"),
    swipeDuration: parseInt(target.getAttribute("pointer-duration")) || 50,                    //6. EventAttribute
    swipeDistance: parseInt(target.getAttribute("pointer-distance")) || 100,
    recorded: [e],
    userSelectStart: body.style.userSelect,                                                    //10. Grabtouch
  };
  document.children[0].style.userSelect = "none";
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
  // Call attributeChangedCallback on each eventTranslator class to REMOVE listeners
  target.setAttributeNode(document.createAttribute("stop-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  return undefined;
}

function onMousedownInitial(trigger) {
  if (trigger.button !== 0)
    return;
  const target = filterOnAttribute(trigger, "swipe");  //fix this
  if (!target)
    return;
  const composedEvent = makeSwipeEvent("start", trigger);    // fix
  captureEvent(trigger, false);
  globalSequence = startSequence(target, composedEvent);
  replaceDefaultAction(target, composedEvent, trigger);
}

function onMousedownSecondary(trigger) {
  const cancelEvent = makeSwipeEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, cancelEvent, trigger);
}

function onMousemove(trigger) {
  if (!globalSequence.cancelMouseout && mouseOutOfBounds(trigger)) {
    const cancelEvent = makeSwipeEvent("cancel", trigger);
    const target = globalSequence.target;
    globalSequence = stopSequence(target);
    replaceDefaultAction(target, cancelEvent, trigger);
    return;
  }
  const composedEvent = makeSwipeEvent("move", trigger);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onMouseup(trigger) {
  const stopEvent = makeSwipeEvent("stop", trigger);
  if (!stopEvent) return;
  captureEvent(trigger, false);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, stopEvent, trigger);
}

function mouseOutOfBounds(trigger) {
  return trigger.clientY < 0 || trigger.clientX < 0 || trigger.clientX > window.innerWidth || trigger.clientY > window.innerHeight;
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

export class mouseDownToSwipeStart extends HTMLElement {
  // initial mousedown listener
  firstConnectedCallback() {
    this.addEventListener('mousedown', mousedownInitialListener, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence") // remove initial event listener after start sequence
      this.removeEventListener('mousedown', mousedownInitialListener, options);
    else  //add new initial mousedown listener when sequence ends
      this.addEventListener('mousedown', mousedownInitialListener, options);
  }
}

export class mouseMoveToSwipeMove extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('mousemove', mousemoveListener, options);
    else
      this.removeEventListener('mousemove', mousemoveListener, options);
  }
}

export class mouseUpToSwipeStop extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('mouseup', mouseupListener, options);
    else
      this.removeEventListener('mouseup', mouseupListener, options);
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

export class mouseDownToSwipeCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('mousedown', mousedownSecondaryListener, options);
    else
      this.removeEventListener('mousedown', mousedownSecondaryListener, options);
  }
}
