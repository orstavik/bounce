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
const thirdArg = supportsPassive ? {capture: true, passive: false} : true;
const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.


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

function findLastEventOlderThan(events, timeTest) {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].timeStamp < timeTest) return events[i];
  }
  return null;
}

function makePinchEvent(name, trigger) {
  let detail;
  if (name === "stop" || name === "cancel") {
    detail = globalSequence.recorded[globalSequence.recorded.length - 1].detail;
  } else {
    detail = makepinchDetail(trigger);
  }
  return new CustomEvent("pinch-" + name, {bubbles: true, composed: true, detail});
}

function makepinchDetail(touchevent) {
  let prevAngle = globalSequence ? globalSequence.recorded[globalSequence.recorded.length - 1].detail.angle : 0;
  const f1 = touchevent.targetTouches[0];
  const f2 = touchevent.targetTouches[1];
  const x1 = f1.pageX;
  const y1 = f1.pageY;
  const x2 = f2.pageX;
  const y2 = f2.pageY;
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const diagonal = Math.sqrt(width * width + height * height);
  const angle = calcAngle(x1 - x2, y1 - y2);
  const rotation = angle - prevAngle.toFixed(3);
  return {touchevent, x1, y1, x2, y2, diagonal, width, height, angle, rotation};
}

function calcAngle(x = 0, y = 0) {
  return ((Math.atan2(y, -x) * 180 / Math.PI) + 270) % 360;
}

function makeSpinEvent(trigger, sequence) {
  const spinTime = trigger.timeStamp - sequence.spinDuration;
  const spinStart = findLastEventOlderThan(sequence.recorded, spinTime);
  if (!spinStart) return null;
  const detail = spinDetails(globalSequence.recorded[globalSequence.recorded.length - 1].detail, spinStart);
  // detail.duration = sequence.spinDuration;
  if (detail.spinDiagonal < sequence.spinDistance) return null;
  detail.angle = calcAngle(detail.distX, detail.distY);
  return new CustomEvent("spin", {bubbles: true, composed: true, detail});
}


function spinDetails(spinEnd, spinStart) {
  const spinWidth = spinStart.detail.width - spinEnd.width;
  const spinHeight = spinStart.detail.height - spinEnd.height;
  const spinDiagonal = Math.sqrt(spinWidth * spinWidth + spinHeight * spinHeight);
  const durationMs = spinEnd.touchevent.timeStamp - spinStart.timeStamp;
  const xFactor = Math.abs(spinStart.detail.width / spinEnd.width);
  const yFactor = Math.abs(spinStart.detail.height / spinEnd.height);
  const diagonalFactor = Math.abs(spinStart.detail.diagonal / spinEnd.diagonal);
  const rotation = Math.abs(spinStart.detail.angle - spinEnd.angle);
  return {durationMs, xFactor, yFactor, diagonalFactor, rotation, spinDiagonal};
}

let oneHit = false;
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
    spinDuration: parseInt(target.getAttribute("spin-duration")) || 100,                      //6. EventAttribute
    spinDistance: parseInt(target.getAttribute("spin-distance")) || 100,
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
  target.setAttributeNode(document.createAttribute("stop-sequence"), checkedPseudoKey); //call attributeChangedCallback on each class
  return undefined;
}

function onTouchInitial(trigger) {
  if (trigger.defaultPrevented)
    return;
  //filter 1
  const touches = trigger.targetTouches.length;
  // should start from one finger
  if (touches === 1)
    oneHit = true;
  if (touches !== 2)
    return;
  if (!oneHit)//first finger was not pressed on the element, so this second touch is part of something bigger.
    return;
  const target = filterOnAttribute(trigger, "pinch");
  if (!target)
    return;
  const composedEvent = makePinchEvent("start", trigger);
  captureEvent(trigger, false);
  globalSequence = startSequence(target, composedEvent);
  // dispatchPriorEvent(target, composedEvent, trigger);
  replaceDefaultAction(target, composedEvent, trigger);
}

function onTouchdownSecondary(trigger) {
  const cancelEvent = makePinchEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, cancelEvent, trigger);
}

function onTouchmove(trigger) {
  const composedEvent = makePinchEvent("move", trigger);
  captureEvent(trigger, false);
  globalSequence = updateSequence(globalSequence, composedEvent);
  replaceDefaultAction(globalSequence.target, composedEvent, trigger);
}

function onTouchend(trigger) {
  oneHit = false;
  trigger.preventDefault();
  const stopEvent = makePinchEvent("stop", trigger);
  const spinEvent = makeSpinEvent(trigger, globalSequence);
  captureEvent(trigger, false);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, stopEvent, trigger);
  if (spinEvent)
    replaceDefaultAction(target, spinEvent, trigger);
}

function onBlur(trigger) {
  const blurInEvent = makePinchEvent("cancel", trigger);
  const target = globalSequence.target;
  globalSequence = stopSequence(target);
  replaceDefaultAction(target, blurInEvent, trigger);
}

function onSelectstart(trigger) {
  trigger.preventDefault();
  trigger.stopImmediatePropagation ? trigger.stopImmediatePropagation() : trigger.stopPropagation();
}

export class touchStartToPinchStart extends HTMLElement {

  // initial mousedown listener
  firstConnectedCallback() {
    this.addEventListener('touchstart', touchInitialListener, thirdArg);
  }

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence") // remove initial event listener after start sequence
      this.removeEventListener('touchstart', touchInitialListener, thirdArg);
    else  //add new initial mousedown listener when sequence ends
      this.addEventListener('touchstart', touchInitialListener, thirdArg);
  }
}

export class touchEndToPinchStart extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.removeEventListener('touchend', touchInitialListener, thirdArg);
    else
      this.addEventListener('touchend', touchInitialListener, thirdArg);

  }
}

export class touchStartToPinchCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchstart', touchdownSecondaryListener, thirdArg);
    else
      this.removeEventListener('touchstart', touchdownSecondaryListener, thirdArg);

  }
}

export class touchMoveToPinchMove extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchmove', touchmoveListener, thirdArg);
    else
      this.removeEventListener('touchmove', touchmoveListener, thirdArg);
  }
}

export class touchEndToPinchStop extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('touchend', touchendListener, thirdArg);
    else
      this.removeEventListener('touchend', touchendListener, thirdArg);
  }
}

export class blurToPinchCancel extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('blur', onBlurListener, thirdArg);
    else
      this.removeEventListener('blur', onBlurListener, thirdArg);
  }
}

export class selectStart extends HTMLElement {

  static get observedAttributes() {
    return ["start-sequence", "stop-sequence"]
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "start-sequence")
      this.addEventListener('selectstart', onSelectstartListener, thirdArg);
    else
      this.removeEventListener('selectstart', onSelectstartListener, thirdArg);
  }
}
