const keys = ['Enter', ' '];

function onkeypress(e) {
  if (!keys.includes(e.key))
    return;
  e.preventDefault();
  setTimeout(() => this.click()); //the click here should transfer the isTrusted, but it will not do so.
  //however, if we run click at once, it will transfer the isTrusted.
  //todo Make sure that the isTrusted property doesn't transfer to the wrong events..
  //todo but this is actually something that works correctly here.. Using setTimeout will fix that issue i think.
}

export class KeypressToClick extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('keypress', onkeypress, {preventable: EventListenerOptions.PREVENTABLE_SOFT/*, trustedOnly: true*/});
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('keypress', onkeypress);
  }
}