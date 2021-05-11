function clickToChange() {
  this.dispatchEvent(new Event('change', {bubbles: true}));
}

export class TranslateClickToChange extends HTMLElement {

  firstConnectedCallback() {
    this.shadowRoot.addEventListener('click', clickToChange, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

function changeTogglesChecked() {
  this.checked = !this.checked;
}

export class ChangeTogglesChecked extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('change', changeTogglesChecked, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}