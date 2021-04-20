//This is an eager implementation of pseudo attributes, which mirror the native platforms implementation of pseudo-classes.
//The pseudo-classes are different from pseudo attributes in two ways.

//1. the pseudo attributes are explicit and eager. Every time a pseudo attribute changes, the DOM is updated to reflect those changes.
//   the pseudo classes are lazy, they are only calculated when a css style needs them?
//   i don't think it is possible to create a good lazy setup here, because the pseudo attributes are nice to see clearly in the DOM,
//   and if we do it lazily, we have no hook so that css can read and access them.

//2. the pseudo attribute works as an attribute in the attribute list on the HTMLElement.
//   The pseudo classes works as an entry in the DomTokenList that is the class attribute on the HTMLElement.

//Pseudo attribute behavior:
//a. the pseudo attribute works implicitly and is set the first time a setAttribute(name, value, key) is called with a key.
//b. there is no unregister. Same as there is no customElements.UNdefine(..)
//c. to clear attributes must be called manually. This is especially commonly needed if you:
//   add elements with such attributes using .innerHTML, .cloneNode(), .appendChild(), document.write(), or
//   to remove any such PseudoAttributes after DOMContentLoaded.

const pseudoAttributes = {};    //name => passKey object.
const setAttributeOG = HTMLElement.prototype.setAttribute;
HTMLElement.prototype.setAttribute = function setAttribute(name, value, passKeyCb) {
  if (name in pseudoAttributes && pseudoAttributes[name] !== passKeyCb)
    throw new Error(`PseudoAttributeError: Attribute '${name}' is a reserved pseudo-attribute and can no longer be set via setAttribute('${name}', value, passKey)`);
  else if (passKeyCb instanceof Object)
    pseudoAttributes[name] = passKeyCb;
  setAttributeOG.call(this, name, value);
};

const removeAttributeOG = HTMLElement.prototype.removeAttribute;
HTMLElement.prototype.removeAttribute = function removeAttribute(name, passKeyCb) {
  if (name in pseudoAttributes && pseudoAttributes[name] !== passKeyCb)
    throw new Error(`Attribute '${name}' is a reserved pseudo-attribute and must be removed using removeAttribute('${name}', passKey).`);
  removeAttributeOG.call(this, name, value);
};

//treewalker, is faster? and can we TreeWalker into shadowRoot?
function* childrenAndShadowRootChildren(node) {
  for (let child of node.children)
    yield child;
  if (node.tagName.indexOf('-') > 0)
    for (let child of node.shadowRoot.children)
      yield child;
}

export function removePseudoAttributes(node, attributes = Object.keys(pseudoAttributes)) {
  for (let att of attributes)
    node.hasAttribute(att) && removeAttributeOG.call(this, att);
  for (let c of childrenAndShadowRootChildren(node))
    removePseudoAttributes(c);
}