// :checked.
//   1. Marshall get/set checked-property to the pseudo attribute.
//   2. Only in a first connectedCallback method, "checked" attribute becomes checked value.
//      We must have this first_connected. Makes things simpler and more efficient.

const checkedPseudoKey = Math.random() + 1;  //this should probably be exportable.

function toggleChecked() {
  this.checked = !this.checked;
}

export class HasChecked extends HTMLElement {

  firstConnectedCallback() {
    if (this.hasAttribute('checked'))
      this.checked = true;
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