const cache = new WeakSet();

export class FirstConnectedCallbackMixin {
  connectedCallback() {
    if (cache.has(this))
      return;
    cache.add(this);
    this.firstConnectedCallback();
  }
}