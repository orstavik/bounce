// ClickToResetEvent, depends on HasForm (.form) property
// This only translates the click event to a reset event. It is a
// On first connected and "type=reset" attributeChanged, then add preventable_soft event listener for click on shadow.
// Then get .form, and if form, call reset on form.

function clickToReset(e) {
  const form = this.form;
  if (!form)
    return;
  e.preventDefault();
  this.form.dispatchEvent(new Event('reset'));
}

export class TranslateClickToReset extends HTMLElement {

  firstConnectedCallback() {
    if (this.getAttribute('type').toLowerCase() !== 'reset')
      return;
    this.shadowRoot.addEventListener('click', clickToReset, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue.toLowerCase() === 'reset')
      this.shadowRoot.addEventListener('click', clickToReset, {
        preventable: EventListenerOptions.PREVENTABLE_SOFT,
        trustedOnly: true
      });
    else
      this.shadowRoot.removeEventListener('click', clickToReset);
  }

  static get observedAttributes() {
    return ['type'];
  }
}

//This ability is added to the <form> type element

function reset(element) {
  //reset the element.
}

export class ResetReceiver extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('reset', this.reset.bind(this), {preventable: EventListenerOptions.PREVENTABLE});
  }

  reset() {
    for (let child of this.elements)
      reset(child);
  }
}