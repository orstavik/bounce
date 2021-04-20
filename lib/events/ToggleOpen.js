function onClick(e) {
  const firstChild = this.children[0];
  if (firstChild?.tagName !== 'SUMMARY' || !e.path.includes(firstChild))
    return;
  e.preventDefault();
  setTimeout(() => this.dispatchEvent(new Event('toggle'/*, {composed: false, bubbles: false}*/)));
}

function onToggle(e) {
  setTimeout(() => this.open = !this.open);
}

export function toggleOpen(el) {
  el.shadowRoot.addEventListener('click', onClick, {
    preventable: EventListenerOptions.PREVENTABLE_SOFT,
    trustedOnly: true
  });
  el.shadowRoot.addEventListener('toggle', onToggle, {preventable: EventListenerOptions.PREVENTABLE/*, trustedOnly: true*/});
  Object.defineProperty(el, 'open', {
    set: function (val) {
      !val ? this.removeAttribute('open') : this.setAttribute('open', '');
      return val;
    },
    get: function () {
      return this.hasAttribute('open');
    },
    enumerable: true,
    configurable: true//todo ?? should this be false?? how strict should we be here?
  })
  //todo the browser only react to isTrusted events. But, there should be no reason for that. Why not let toggling be triggered by any toggle event?
}

export function ToggleOpen(Base) {
  return class ToggleOpen extends Base {
    constructor() {
      super();
      el.shadowRoot.addEventListener('click', onClick, {
        preventable: EventListenerOptions.PREVENTABLE,
        trustedOnly: true
      });
      el.shadowRoot.addEventListener('toggle', onToggle, {preventable: EventListenerOptions.PREVENTABLE/*, trustedOnly: true*/});
    }

    get open() {
      return this.hasAttribute('open');
    }

    set open(val) {
      !val ? this.removeAttribute('open') : this.setAttribute('open', '');
      return val;
    }
  }
}