export function KeyToClickMixin(Base) {
  return class KeyToClickMixin extends Base {
    constructor() {
      super();
      this.shadowRoot.addEventListener('keydown', function (e) {
        ['Enter', ' '].includes(e.key) && this.click();
      });
    }
  }
}

export function TabbableMixin(Base) {
  return class TabbableMixin extends Base {
    constructor() {
      super();
      //todo
      //its the `Document` that has the `focus` and so the element has the `focus-within`. should be.
    }
  }
}