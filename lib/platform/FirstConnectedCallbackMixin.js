const cache = new WeakSet();

export function FirstConnectedCallbackMixin(base) {
 return class FirstConnectedCallbackMixin extends base {
  connectedCallback() {
    if (cache.has(this))
      return;
    cache.add(this);
    this.firstConnectedCallback();
  }
 }
} 
