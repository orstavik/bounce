// :checked.
//   1. Marshall get/set checked-property to the pseudo attribute.
//   2. Only in a first connectedCallback method, "checked" attribute becomes checked value.
//      We must have this first_connected. Makes things simpler and more efficient.

const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

export class HasChecked extends HTMLElement {

  firstConnectedCallback() {
    this.checked = this.hasAttribute('checked');
  }

  reset() {
    this.checked = this.hasAttribute('checked');
  }

  get checked() {
    return this.hasAttribute(':checked');
  }

  set checked(val) {
    val ?
      this.setAttributeNode(document.createAttribute(':checked'), checkedPseudoKey) :
      this.removeAttribute(':checked', checkedPseudoKey);
  }
}

export class HasCheckedRadio extends HTMLElement {

  firstConnectedCallback() {
    this.checked = this.hasAttribute('checked');
  }

  reset() {
    this.checked = this.hasAttribute('checked');
  }

  get checked() {
    return this.hasAttribute(':checked');
  }

  set checked(val) {
    if (val) {
      //find previously set sibling, and set .checked = false on it.
      this.setAttributeNode(document.createAttribute(':checked'), checkedPseudoKey);
      // Promise.resolve().then(()=>{  and then set the first .checked in this group to true});
    } else{
      this.removeAttribute(':checked', checkedPseudoKey);
    }
  }
}