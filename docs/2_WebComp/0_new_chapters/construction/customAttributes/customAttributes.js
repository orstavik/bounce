(function () {
  MonkeyPatch.deprecate(Element.prototype, 'setAttributeNS');
  MonkeyPatch.deprecate(Element.prototype, 'setAttributeNodeNS');
  MonkeyPatch.monkeyPatch(Element.prototype, 'setAttribute', function setAttribute_CA(og, name, value) {
    if (name[0] === ':' && name[1] !== ':' && this.hasAttribute(name))
      throw new SyntaxError(`The value of the custom attribute "${name}" can only be *changed* from the CustomAttribute definition.`);
    const res = og.call(this, name, value);
    upgradeAttribute(this.getAttributeNode(name));
    return res;
  });
  MonkeyPatch.monkeyPatch(Element.prototype, 'setAttributeNode', function setAttributeNode_CA(og, attr) {
    if (attr.name[0] === ':' && attr.name[1] !== ':' && this.hasAttribute(attr.name))
      throw new SyntaxError(`The value of the custom attribute "${attr.name}" can only be *changed* from the CustomAttribute definition.`);
    const res = og.call(this, attr);
    upgradeAttribute(attr);
    return res;
  });
  MonkeyPatch.monkeyPatchSetter(Attr.prototype, 'value', function value_CA(og, val) {
    if (this.name[0] === ':' && this.name[1] !== ':')
      throw new SyntaxError(`The value of the custom attribute "${this.name}" can only be *changed* from the CustomAttribute definition.`);
    return og.call(this, val);
  });
  //todo MonkeyPatch.monkeyPatch(Element.prototype, 'removeAttribute', function removeAttribute_CA(og, val) {
  //todo MonkeyPatch.monkeyPatch(Element.prototype, 'removeAttributeNode', function removeAttributeNode_CA(og, val) {
  //todo remove attribute will delete the prototype??

  const setValueOG = MonkeyPatch.lockOG("Attr.value");

  const defs = {};
  const cache = {};

  function* weakArrayIterator(wa) {  //todo this is ok now, but if we await while inside a for loop with this iterator, then it can break.
    for (let i = 0; i < wa.length; i++) {
      let el = wa[i].deref();
      el ? yield el : wa.splice(i--, 1);
    }
  }

  function upgradeAttribute(ca, def = defs[ca.name]) {
    if (!def)
      return (cache[ca.name] ??= []).push(new WeakRef(ca));
    //1. we have already done a syntax check of the def, so we can just set the new prototype on the attribute object.
    Object.setPrototypeOf(ca, def);
    //2. make the setCustomValue(val) function for this specific custom attribute
    const setCustomValue = function setValue(val) {
      setValueOG.call(ca, val);
    };
    ca.upgrade(setCustomValue);                     //todo here the callback is made
  }

  function* customAttributes(elements) {
    for (let el of elements)
      for (let a of el.attributes)
        if (a.name[0] === ':' && a.name[1] !== ':')
          yield a;
  }

  class CustomAttributeRegistry {

    //the upgrade happens at ConstructionFrame end.
    //ConstructionFrame end is the time that we are most assure that no elements with attributes have been created without us knowing.
    constructor() {
      ConstructionFrame.observe('end', frame => {
        for (let ca of customAttributes(frame.elements()))
          upgradeAttribute(ca, undefined);
      });
    }

    define(name, definition) {
      //1. first check registry, name and definition for errors.
      if (defs[name])
        throw new SyntaxError(`CustomAttribute "${name}" is already defined.`);

      //todo enable MutableCustomAttributes?? by simple patching Element.setAttribute, Attr.value and skipping this check
      if (name[0] !== ':' || name[1] === ':')
        throw new SyntaxError(`CustomAttribute names must be on the form ':custom' or ':custom-attribute', not: ${name}`);
      if (definition.prototype instanceof Attr) //todo untested, this should allow for class inheritance.
        throw new SyntaxError(`CustomAttribute definition must 'extends Attr', not: '${definition.prototype.name}'.`);

      defs[name] = definition;
      for (let ca of weakArrayIterator(cache[name]))
        upgradeAttribute(ca, definition);
    }
  }

  window.customAttributes = new CustomAttributeRegistry();
})();