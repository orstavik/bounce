import {SlotCallbackMixin} from "./SlotCallbackMixin.js";

function makeAttributeChangedCallback(mixins) {
  const mixinsAttribute = mixins.filter(mixin => 'observedAttributes' in mixin && 'attributeChangedCallback' in mixin.prototype);
  if (!mixinsAttribute.length)
    return {};
  if (mixinsAttribute.length === 1) {
    const observedAttributes = mixinsAttribute[0].observedAttributes;
    const attributeChangedCallback = mixinsAttribute[0].prototype.attributeChangedCallback;
    return {observedAttributes, attributeChangedCallback};
  }
  const nameToAttributeChangedCallback = {};
  for (let mixin of mixinsAttribute) {
    const cb = mixin.prototype.attributeChangedCallback;
    for (let name of mixin.observedAttributes)
      name in nameToAttributeChangedCallback ?
        nameToAttributeChangedCallback[name].push(cb) :
        nameToAttributeChangedCallback[name] = [cb]
  }
  const observedAttributes = Object.keys(nameToAttributeChangedCallback);
  const attributeChangedCallback = function attributeChangedCallback(name, oldValue, newValue) {
    for (let cb of nameToAttributeChangedCallback[name])
      cb.call(this, name, oldValue, newValue);
  }
  return {observedAttributes, attributeChangedCallback};
}

function unionStaticProperties(mixins, ignore) {
  const res = {}
  for (let mixin of mixins) {
    for (let name of Object.getOwnPropertyNames(mixin).filter(name => !ignore.includes(name))) {
      if (name in res)
        throw new Error(`static ${mixin.name}.${name} has already been defined. Mixins cannot share static properties, except observedAttributes.`);
      res[name] = Object.getOwnPropertyDescriptor(mixin, name);
    }
  }
  return res;
}

function unionPrototypeProperties(mixins, ignore) {
  const properties = {}
  const callbacks = {}
  for (let mixin of mixins) {
    for (let name of Object.getOwnPropertyNames(mixin.prototype).filter(name => !ignore.includes(name))) {
      if (name in properties)
        throw new Error(`${mixin.name}.${name} has already been defined. Mixins cannot share properties that do not end with 'Callback'.`);
      if (name.endsWith('Callback'))
        callbacks[name] ? callbacks[name].push(mixin.prototype[name]) : (callbacks[name] = [mixin.prototype[name]]);
      else
        properties[name] = Object.getOwnPropertyDescriptor(mixin.prototype, name);
    }
  }
  return {properties, callbacks};
}

//mutates the values of the callbackMap
function makeCallbackDescriptions(nameToCallbacks) {
  for (let name of nameToCallbacks) {
    const callbacks = nameToCallbacks[name];
    const xyzCallback = function (...args) {
      for (let cb of callbacks)
        cb.call(this, ...args);
    };
    Object.defineProperty(xyzCallback, 'name', {configurable: true, value: name});
    nameToCallbacks[name] = {value: xyzCallback, configurable: true, enumerable: true};
  }
  return nameToCallbacks;
}

const nothingProto = Object.getPrototypeOf(Object);

function typeCheckMixin(mixin) {
  const xyzCallbacks = [];
  if (Object.getPrototypeOf(mixin) !== nothingProto)
    throw new Error('Mixins must not "extends" anything. Do NOT "extends HTMLElement".');
  const props = Object.getOwnPropertyDescriptors(mixin.prototype);
  for (let [name, description] of Object.entries(props)) {
    if (name.endsWith('Callback')) {
      if (!description.value instanceof Function)
        throw new Error(`${mixin.name}.${name} is not a function.`);
      xyzCallbacks.push(name);
    }
  }
  return xyzCallbacks;
}

function mixElement(className, mixins) {
  //1. typecheck mixins
  const xyzCallbacks = mixins.map(typeCheckMixin).flat(1);
  if (xyzCallbacks.includes('slotCallback'))
    mixins.push(SlotCallbackMixin);

  //2. analysis
  const staticProps = unionStaticProperties(mixins, ['length', 'name', 'prototype', 'observedAttributes']);
  let {callbacks, properties} = unionPrototypeProperties(mixins, ['constructor', 'attributeChangedCallback']);
  callbacks = makeCallbackDescriptions(callbacks);
  const {attributeChangedCallback, observedAttributes} = makeAttributeChangedCallback(mixins);


  //3. make the new
  class MixedCustomElement extends HTMLElement {
    constructor() {
      super();
    }
  }

  //4. define all properties on the prototype and the constructor (static)
  Object.defineProperty(MixedCustomElement, 'name', {value: className});
  Object.defineProperty(MixedCustomElement.prototype, 'name', {value: className});
  Object.defineProperties(MixedCustomElement, staticProps);
  Object.defineProperties(MixedCustomElement.prototype, properties);
  Object.defineProperties(MixedCustomElement.prototype, callbacks);
  if (observedAttributes) {
    Object.defineProperty(MixedCustomElement, 'observedAttributes', {
      get: function () {
        return observedAttributes;
      }
    });
    Object.defineProperty(MixedCustomElement.prototype, 'attributeChangedCallback', {value: attributeChangedCallback});
  }

  return MixedCustomElement;
}

function toCamelCase(str) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
}

Object.defineProperty(customElements, 'mix', {
  value: function (tagName, listOfMixins) {
    const MixedCustomElement = mixElement(toCamelCase(tagName), listOfMixins);
    customElements.define(tagName, MixedCustomElement);
    return MixedCustomElement;
  }
});