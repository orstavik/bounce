function onClick(e) {
  const firstChild = this.children[0];
  if (firstChild?.tagName !== 'SUMMARY' || !e.path.includes(firstChild))
    return;
  e.preventDefault();
  this.dispatchEvent(new Event('toggle'/*, {composed: false, bubbles: false}*/));
  // setTimeout(() => this.dispatchEvent(new Event('toggle'/*, {composed: false, bubbles: false}*/)));
  //todo the browser queues the toggle and the action in the event loop. But I don't think there is any good reason for it.
}

function onToggle(e) {
  this.open = !this.open;
  // setTimeout(() => this.open = !this.open);
  //todo the browser queues the toggle and the action in the event loop. But I don't think there is any good reason for it.
}

//todo the browser only react to isTrusted events. But, there should be no reason for that. Why not let toggling be triggered by any toggle event?
export class ToggleOpen /*extends HTMLElement*/ {
  connectedCallback() {
    this.shadowRoot.addEventListener('click', onClick, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
    this.shadowRoot.addEventListener('toggle', onToggle, {
      preventable: EventListenerOptions.PREVENTABLE,
      trustedOnly: true
    });
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('click', onClick);
    this.shadowRoot.removeEventListener('toggle', onToggle);
  }

  get open() {
    return this.hasAttribute('open');
  }

  set open(val) {
    !val ? this.removeAttribute('open') : this.setAttributeNode(document.createAttribute('open'));
    return val;
  }
}