const cache = new WeakSet();

export class FirstConnectedCallbackMixin extends HTMLElement {
  connectedCallback() {
    if (cache.has(this))
      return;
    cache.add(this);
    this.firstConnectedCallback();
  }
}