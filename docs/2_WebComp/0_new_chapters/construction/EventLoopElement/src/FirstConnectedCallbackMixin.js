const cache = new WeakSet();

class FirstConnectedCallbackMixin extends HTMLElement {
  connectedCallback() {
    if (cache.has(this))
      return;
    cache.add(this);
    this.firstConnectedCallback();
  }
}