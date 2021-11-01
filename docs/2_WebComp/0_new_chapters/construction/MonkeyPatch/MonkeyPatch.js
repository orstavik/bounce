(function () {

  window.MonkeyPatch = class MonkeyPatch {

    static monkeyPatch(proto, prop, fun) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      const og = descriptor.value;
      descriptor.value = function monkeypatch(...args) {
        return fun.call(this, og, ...args);
      };
      Object.defineProperty(proto, prop, descriptor);
    }

    static monkeyPatchSetter(proto, prop, fun) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
      const og = descriptor.set;
      descriptor.set = function monkeypatch(...args) {
        return fun.call(this, og, ...args);
      };
      Object.defineProperty(proto, prop, descriptor);
    }

    static dropClass(cnstr) {
      Object.setPrototypeOf(cnstr, Object.getPrototypeOf(Object.getPrototypeOf(cnstr)));
      Object.setPrototypeOf(cnstr.prototype, Object.getPrototypeOf(Object.getPrototypeOf(cnstr.prototype)));
    }

    static injectClass(cnstr, superCnstr) {
      Object.setPrototypeOf(superCnstr, Object.getPrototypeOf(cnstr));
      Object.setPrototypeOf(superCnstr.prototype, Object.getPrototypeOf(cnstr.prototype));
      Object.setPrototypeOf(cnstr, superCnstr);
      Object.setPrototypeOf(cnstr.prototype, superCnstr.prototype);
    }

    static injectClassWhileLoading(OG, superCnstr) {
      if (document.readyState !== 'loading')
        return;
      MonkeyPatch.injectClass(OG, superCnstr);
      window.addEventListener('readystatechange', () => MonkeyPatch.dropClass(OG), {once: true, capture: true});
    }
  }
})();