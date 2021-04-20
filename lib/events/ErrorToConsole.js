function log(error){
  console.error(error);
}

export function errorToConsole(el, onOff = true){
  if(onOff)
    el.shadowRoot.addEventListener('error', log, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
   else
    el.shadowRoot.removeEventListener('error', log);
}

export function ErrorToConsole(Base){
  return class ErrorToConsole extends Base{
    constructor() {
      super();
      errorToConsole(this);
    }
  };
}