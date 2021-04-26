export class ErrorToConsole extends HTMLElement {
  connectedCallback() {
    this.shadowRoot.addEventListener('error', console.error, {preventable: EventListenerOptions.PREVENTABLE_SOFT});
  }

  disconnectedCallback() {
    this.shadowRoot.removeEventListener('error', console.error);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    newValue ?
      this.shadowRoot.addEventListener('error', console.error, {preventable: EventListenerOptions.PREVENTABLE_SOFT}) :
      this.shadowRoot.removeEventListener('error', console.error);
  }

  static get observedAttributes() {
    return ['stop-error-log'];
  }
}