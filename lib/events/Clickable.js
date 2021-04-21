const EventListenerOptions = {
  PREVENTABLE: true
}

function topMostTarget(pathA) {
  let res = document.body;
  for (let i = pathA.length - 5; i >= 0; i--)
    res = pathA[i];
  return res;
}

const addEventListenerOG = EventTarget.prototype.addEventListener;
const removeEventListenerOG = EventTarget.prototype.removeEventListener;

function handleEventListener(element, method, type, cb) {
  method.call(element, type, cb, {
    preventable: EventListenerOptions.PREVENTABLE,
    trustedOnly: true
  });
}

function onMousedown(e) {
  if (e.button === 0) {
    handleEventListener(this, removeEventListenerOG, "mousedown", onMousedown)
    handleEventListener(this, addEventListenerOG, "mouseup", onMouseup);
  }
}

function onMouseup(e) {
  handleEventListener(this, addEventListenerOG, "mousedown", onMousedown)
  handleEventListener(this, removeEventListenerOG, "mouseup", onMouseup)
  if (e.button === 0) {
    const clickTarget = topMostTarget(e.composedPath());
    setTimeout(() => clickTarget.dispatchEvent(new MouseEvent('my-click', e)));
  }
}

export function clickable(el, connectDisconnect = true, duration = 300, distance = 5) {
  if (connectDisconnect) {
    handleEventListener(el.shadowRoot, addEventListenerOG, "mousedown", onMousedown)
  } else {
    handleEventListener(el.shadowRoot, removeEventListenerOG, "mousedown", onMousedown)
  }
}

export function Clickable(Base, connectDisconnect = true, duration = 300, distance = 5) {
  return class Clickable extends Base {
    constructor() {
      super();
      clickable(this, true, duration, distance);
    }
  }
}
