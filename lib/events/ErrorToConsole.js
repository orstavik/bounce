function log(error) {
  !this.hasAttribute('stop-error-log') && console.error(error);
}

export function errorToConsole(el, onOff = true) {
  if (onOff)
    el.shadowRoot.addEventListener('error', log, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
  else
    el.shadowRoot.removeEventListener('error', log);
}

export function ErrorToConsole(Base) {
  //todo do a type check to see that Base is instanceof Element??
  return class ErrorToConsole extends Base {
    constructor() {
      super();
      errorToConsole(this);
    }
  };
}