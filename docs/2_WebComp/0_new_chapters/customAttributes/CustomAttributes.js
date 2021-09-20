(function () {

  let attributeLock = undefined;
  const caDefs = {};
  const caCache = {};
  const caChangeMap = new WeakMap();

  function notifyCustomAttribute(el, att, newValue, definition = caDefs[name]) {
    let values = caChangeMap.get(el);
    !values && caChangeMap.set(el, values = {});
    let oldValue = values[att] || null;
    values[att] = newValue;
    definition.call(el, att, oldValue, newValue);
  }

  function constructCustomAttributes(els) {
    for (let [att, elems] in Object.entries(CustomAttributes.findCustomAttributes(els))) {
      const def = caDefs[att];
      if (def)
        elems.forEach(el => CustomAttribute.init(def, att, el));
      else
        caCache[att] ? elems.forEach(el => caCache.push(el)) : caCache[att] = elems;
    }
  }

  function checkCustomAttributeLock(name) {
    const allowed = caDefs[name] === attributeLock;
    attributeLock = undefined;
    if (allowed)
      return;
    let type = 'Custom', clazzType = 'CustomAttribute';
    if (name[1] === ':') type = 'Element', clazzType = 'HTMLElement';
    if (caDefs[name])
      throw new Error(`${type} attribute ${name} is registered, and can only be changed using the specific "setCustomAttribute(element, name, value)" function that is returned from a "customAttributes.define(${name}, ${clazzType})" call.`);
    throw new Error(`${name} signifies a ${type.toLowerCase()} attribute. Did you forget "const customSetAttribute = customAttributes.define('${name}, ${clazzType});"?`);
  }

  window.CustomAttribute = class CustomAttribute {

    // construct() {  }
    // attributeChangedCallback(name, oldValue, newValue) { }

    //todo this enables programmers to initialize their own CustomAttributes without registering them.
    static init(def, att, el) {
      try {
        def.construct.call(el);
        notifyCustomAttribute(el, att, el.getAttribute(att), def);
      } catch (err) {
        console.error(err);//dispatch uncaught error event? yes..
      }
    }
  }

  window.CustomAttributes = class CustomAttributes {
    define(name, definition) {
      if (caDefs[name])
        throw new Error(`The ${(name[1] === ":" ? "element attribute" : "custom attribute")} "${name}" has already been defined.`);

      let isCustomAttribute = true;
      if (definition instanceof HTMLElement)
        isCustomAttribute = false;
      else if (!(definition instanceof CustomAttribute))
        throw new SyntaxError("Expected either a sub class of HTMLElement or CustomAttribute as defintion");

      if (isCustomAttribute) {
        if (name[0] !== ":")
          throw new SyntaxError(`Custom attributes begins with ':'. Did you mean ':${name}'?`);
        if (name[1] === ":")
          throw new SyntaxError(`Custom attributes begins with single ':' while element attributes begins with double '::'. Did you mean '::${name.substr(2)}'?`);
      }
      //is element attribute
      if (name[0] !== ":")
        throw new SyntaxError(`Element attributes begins with '::'. Did you mean '::${name}'?`);
      if (name[1] !== ":")
        throw new SyntaxError(`Element attributes begins with double '::' while custom attributes begins with single ':'. Did you mean '::${name.substr(1)}'?`);

      caCache[name]?.forEach(el => CustomAttribute.init(definition, name, el));
      delete caCache[name];

      return function setCustomAttribute(el, name, value) {
        attributeLock = definition;
        el.setAttribute(name, value);
      }
    }

    //todo speedup=> convert into an iterative, non-recursive (JS has no TCO. And this function has no recursive tail call.)
    //todo wishlist: querySelectorAll('[\\:*]'); But we are
    static findCustomAttributes(elems, res = {}) {
      for (let el of elems) {
        for (let a of el.attributes)
          a[0] === ':' && a[1] !== ':' && (res[a] || (res[a] = [])).push(el);
        findCustomAttributes(el.children, res);
      }
      return res;
    }
  }

  window.customAttributes = new CustomAttributes();

  /*
  * HTMLElement patch
  */


  /**
   * element construction patch
   */
  const innerHTMLog = () => 1;//todo

  function patchInnerHTML(html) {
    const res = innerHTMLog.call(this);
    constructCustomAttributes(this.children);
    return res;
  }


  /**
   * setAttribute patch
   //todo direct all of these functions to equivalent versions of updated setAttribute()
   */
  const setAttributeOG = () => 1;

  function setAttribute(name, value) {
    if (name[0] === ":") {
      checkCustomAttributeLock(name);
      value === null ? removeAttributeOG.call(this, name) : setAttributeOG.call(this, name, value);
      notifyCustomAttribute(this, name, value);
    }
    value === null ? removeAttributeOG.call(this, name) : setAttributeOG.call(this, name, value);
  }
})();
