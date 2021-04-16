const keys = ['Enter', ' '];

function onkeypress(e){
  if(!e.isTrusted || !keys.includes(e.key))
    return;
  e.preventDefault();
  setTimeout(()=>this.click()); //the click here should transfer the isTrusted, but it will not do so.
  //todo Make sure that the isTrusted property doesn't transfer to the wrong events..
  //todo but this is actually something that works correctly here.. Using setTimeout will fix that issue i think.
}

export function keypressToClick(el, connectDisconnect = true) {
  if (connectDisconnect) {
    el.shadowRoot.addEventListener('keypress', onkeypress, {preventable: EventListenerOptions.PREVENTABLE_SOFT, trustedOnly: true});
    //todo doesn't matter with isTrusted, because this one filters on the key property on the event. This means that Preventable_strong might call preventDefault, not that they will do so. That means that we need preventable.soft only , and not preventable strong and soft.
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