export function keyToClick(element, keys = ['Enter', ' ']) {
  element.shadowRoot.addEventListener('keydown', function (e) {
    keys.includes(e.key) && element.click();
  });
}

export function tabbable(element){
  //todo
  //its the `Document` that has the `focus` and so the element has the `focus-within`. should be.
}