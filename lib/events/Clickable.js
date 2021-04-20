const EventListenerOptions = {
  PREVENTABLE: true
}

function topMostTarget(pathA) {
  let res = document.body;
  for (let i = pathA.length - 5; i >= 0; i--)
    res = pathA[i];
  return res;
}

function onMousedown(e){
    if (e.button === 0) {
    this.removeEventListener('mousedown', onMousedown, {
      preventable: EventListenerOptions.PREVENTABLE,
      trustedOnly: true
    });
    this.addEventListener('mouseup', onMouseup, {
      preventable: EventListenerOptions.PREVENTABLE,
      trustedOnly: true
    });
  }
}

function onMouseup(e) {
  if (e.button === 0) {
    const clickTarget = topMostTarget(e.composedPath());
    setTimeout(() => clickTarget.dispatchEvent(new MouseEvent('click', e)));
  }
}

export function clickable(el, connectDisconnect = true, duration = 300, distance = 5) {
  if (connectDisconnect) {
    el.shadowRoot.addEventListener('mousedown', onMousedown, {preventable: EventListenerOptions.PREVENTABLE, trustedOnly: true});
  } else {
    el.shadowRoot.removeEventListener('mousedown', onMousedown);
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
