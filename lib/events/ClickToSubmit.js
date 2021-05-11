// ClickToReset, depends on HasForm
// On first connected and "type=reset" attributeChanged, then add preventable_soft event listener for click on shadow.
// Then get .form, and if form, call reset on form.

function clickResets(e) {
  const form = this.form;
  if (!form)
    return;
  e.preventDefault();
  form.reset();
}

export class ClickToReset extends HTMLElement {

  firstConnectedCallback() {
    if (this.getAttribute('type').toLowerCase() !== 'reset')
      return;
    this.shadowRoot.addEventListener('click', clickResets, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue.toLowerCase() === 'reset')
      this.shadowRoot.addEventListener('click', clickResets, {
        preventable: EventListenerOptions.PREVENTABLE_SOFT,
        trustedOnly: true
      });
    else
      this.shadowRoot.removeEventListener('click', clickResets);
  }

  static get observedAttributes() {
    return ['type'];
  }
}