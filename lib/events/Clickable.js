function onMousedown(e){
  //todo
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