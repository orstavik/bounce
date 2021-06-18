class HTMLElementShadow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = '<slot></slot>';
  }
}
// todo
// class HTMLElementShadowLight extends HTMLElement {
//   constructor() {
//     super();
//     this.shadowRoot = {};
//   }
//   attachShadow(init) {
//     //override to do nothing
//   }
// }

function newCallback(name, mixins) {
  const callbacks = mixins.map(mixin => mixin.prototype[name]);

  function ___Callback(...args) {
    for (let cb of callbacks)
      cb.call(this, ...args);
  }

  Object.defineProperty(___Callback, 'name', {configurable: true, value: name});
  return ___Callback;
}

function newACCallback(mixins) {
  const attToCb = {};
  for (let mixin of mixins) {
    const cb = mixin.prototype.attributeChangedCallback;
    if(!cb || !mixin.observedAttributes) continue;
    for (let name of mixin.observedAttributes)
      name in attToCb ? attToCb[name].push(cb) : attToCb[name] = [cb]
  }
  return function attributeChangedCallback(name, oldValue, newValue) {
    for (let cb of attToCb[name])
      cb.call(this, name, oldValue, newValue);
  }
}

export function mix(className, mixins) {
  //1. typecheck mixins
  for (let mixin of mixins)
    if (Object.getPrototypeOf(mixin) !== HTMLElement)
      throw new Error(`ElementMixins must be a direct descendant on HTMLElement, ie. "${mixin.name} extends HTMLElement".`);
  //x. todo should we typecheck for constructors? should we assume that there could be only one constructor among the mixins?
  //        should we display warning for constructors that will not be called? probably yes.

  //2. the first one is the last one. Makes Object.assign(...mixins) much simpler
  mixins.reverse();

  //3. constructor synthesis
  const staticProps = Object.assign(...mixins.map(mixin => Object.getOwnPropertyDescriptors(mixin)));
  delete staticProps.prototype;
  staticProps.name.value = className;
  if (staticProps.observedAttributes) {
    const observingMixins = mixins.filter(mixin => mixin.observedAttributes);
    if (observingMixins.length > 1) {
      const observedAttributes = observingMixins.map(mixin => mixin.observedAttributes).flat(1).filter((e, i, a) => a.indexOf(e) === i);
      staticProps.observedAttributes.get = function () {
        return observedAttributes;
      }
    }
  }
  //4. prototype synthesis
  const protoProps = Object.assign(...mixins.map(mixin => Object.getOwnPropertyDescriptors(mixin.prototype)));
  delete protoProps.constructor;
  for (let name of Object.keys(protoProps).filter(name => name.endsWith('Callback'))) {
    const mixinsWithCb = mixins.filter(mixin => name in mixin.prototype);
    if (mixinsWithCb.length > 1) {
      protoProps[name].value =
        name === 'attributeChangedCallback' ?
          newACCallback(mixins) :
          newCallback(name, mixinsWithCb);
    }
  }

  //5. make the new HTMLElement class
  const MixedElement = class __mixed__ extends HTMLElementShadow {
    constructor() {
      super();
    }
  }
  //6. upgrade the new mixed Element constructor and prototype
  Object.defineProperties(MixedElement, staticProps);
  Object.defineProperties(MixedElement.prototype, protoProps);
  return MixedElement;
}

//customElements.mix("my-web-comp", [Clickable, HrefVisitedLink, Focusable, Taggable, KeypressToClick, Draggable]);
// Object.defineProperty(customElements, 'mix', {
//   value: function (tagName, listOfMixins) {
//     const className = (" " + tagName).toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase()); //tag-name => TagName
//     const MixedCustomElement = mixElement(className, listOfMixins);
//     customElements.define(tagName, MixedCustomElement);
//     return MixedCustomElement;
//   }
// });

//CustomElements.plugin(aDivElement, [Dblclickable, Draggable]);
//CustomElements.unplug(aDivElement, [Draggable]);