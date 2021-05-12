//1. translate click into reset event (translate mixin)
//2. receive the reset event, and then do state change of this element and related elements (receiver mixin)

// ClickToResetEvent, depends on HasForm (.form) property
// This only translates the click event to a reset event. It is a
// On first connected and "type=reset" attributeChanged, then add preventable_soft event listener for click on shadow.
// Then get .form, and if form, call reset on form.

//you would like to make a <input-reset> element or <button-reset> element, you don't want the type="reset", that is an antipattern.
export class TranslateClickToReset extends HTMLElement {

  firstConnectedCallback() {
    this.shadowRoot.addEventListener('click', () => this.form?.dispatchEvent(new Event('reset')), {preventable: EventListenerOptions.PREVENTABLE});
  }
}

//This ability is added to the <form> type element

export class ResetReceiver extends HTMLElement {
  firstConnectedCallback() {
    this.shadowRoot.addEventListener('reset', this.reset.bind(this), {preventable: EventListenerOptions.PREVENTABLE});
  }

  reset() {
    for (let child of this.elements)
      child.reset();
  }
}


//this mixin emulate the browsers native behavior based on <input type="reset"> or <button type="reset">

function clickToReset(e) {
  const form = this.form;
  if (!form)
    return;
  e.preventDefault();
  this.form?.dispatchEvent(new Event('reset'));
}

export class TranslateClickToResetType extends HTMLElement {

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
