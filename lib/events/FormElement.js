export class FormElements extends HTMLElement {
  get elements() {
    return Array.from(this.querySelectorAll('*')).filter(el => el.form === this);
  }
}

export class HasForm extends HTMLElement {
  get form() {
    for (let p = this.parentNode; p instanceof HTMLElement; p = p.parentNode) {
      if (p instanceof HTMLFormElement)
        return p;
    }
  }
}