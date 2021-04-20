const keys = ['Enter', ' '];

function onkeypress(e){
  if(!e.isTrusted || !keys.includes(e.key))
    return;
  e.preventDefault();
  setTimeout(()=>this.click()); //the click here should transfer the isTrusted, but it will not do so.
  //however, if we run click at once, it will transfer the isTrusted.
  //todo Make sure that the isTrusted property doesn't transfer to the wrong events..
  //todo but this is actually something that works correctly here.. Using setTimeout will fix that issue i think.
}

export function keypressToClick(el, connectDisconnect = true) {
  if (connectDisconnect) {
    //preventable_soft means that it may or may not call preventDefault, but that it is always blocked by defaultPrevented.
    el.shadowRoot.addEventListener('keypress', onkeypress, {preventable: EventListenerOptions.PREVENTABLE_SOFT, trustedOnly: true});
    cache.set(el, keys);
  } else {
    el.shadowRoot.removeEventListener('keypress', onkeypress);
    cache.delete(el);
  }
}

export function KeypressToClick(Base){
  return class KeypressToClick extends Base{
    constructor() {
      super();
      keypressToClick(this);
    }
  }
}