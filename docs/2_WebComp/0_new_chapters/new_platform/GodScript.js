(function () {
  /*
   * LIFE-CYCLE INHERITANCE
   * 1. Enforce super.connectedCallback(), super.disconnectedCallback(), super.attributeChangedCallback() as first line in methods
   * 2. aggregate static get observedAttributes() for super classes
   */

// const nonCommentSafeMatcher = /^[^{]+\{\s*super.connectedCallback\(/;
  const connected = /^[^{]+\{((\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)|(\/\/(?:[^\r\n]|\r(?!\n))*)|\s)*super.connectedCallback\(/;
  const disconnected = /^[^{]+\{((\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)|(\/\/(?:[^\r\n]|\r(?!\n))*)|\s)*super.disconnectedCallback\(/;
  const attribute = /^[^(]+\(([^)]*)\)[^{]*\{((\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)|(\/\/(?:[^\r\n]|\r(?!\n))*)|\s)*super.attributeChangedCallback\(([^)]*)\)/;

  function checkConnected(proto) {
    if (Object.getOwnPropertyDescriptor(proto, "connectedCallback") && !connected.exec(proto.connectedCallback.toString()))
      throw new SyntaxError(`Missing super.connectedCallback() at the start of ${proto.constructor.name}.connectedCallback()`);
  }

  function checkDisconnected(proto) {
    if (Object.getOwnPropertyDescriptor(proto, "disconnectedCallback") && !disconnected.exec(proto.disconnectedCallback.toString()))
      throw new SyntaxError(`Missing super.disconnectedCallback() at the start of ${proto.constructor.name}.disconnectedCallback()`);
  }

  function checkAttributeChanged(proto) {
    if (!Object.getOwnPropertyDescriptor(proto, "attributeChangedCallback"))
      return;
    const string = proto.attributeChangedCallback.toString();
    const regExpExecArray = attribute.exec(string);
    if (!regExpExecArray)
      throw new SyntaxError(`Missing super.attributeChangedCallback(...) at the start of ${proto.constructor.name}.attributeChangedCallback(...)`);
    const params = regExpExecArray[1];
    const superArguments = regExpExecArray[5];
    //todo remove whitespaces and comments from params and superArguments
    if (params === superArguments || superArguments === '...arguments')
      return;
    throw new SyntaxError(`Cannot recognize the arguments in super.attributeChangedCallback(...) at the start of ${proto.constructor.name}.attributeChangedCallback(...)\n ${params} !== ${superArguments}. It might be correct, try to simplify or use "super.attributeChangedCallback(...arguments)" instead.`);
  }

//returns undefined if there are no extra super observed attributes or if the list of observedAttributes is empty
  function getSuperTypesObservedAttributes(proto) {
    let observed = [];
    for (let clazz = proto; clazz !== HTMLElement; clazz = Object.getPrototypeOf(clazz))
      clazz.observedAttributes instanceof Array && (observed = [...observed, ...clazz.observedAttributes]);
    observed = observed.filter((str, i, ar) => ar.indexOf(str) === i);
    return !observed.length || observed.length === proto.observedAttributes.length ?
      undefined :
      observed;
  }

  const defineWithChecks = function define(tag, clazz, ...args) {
    for (let proto = clazz.prototype; proto !== HTMLElement.prototype; proto = Object.getPrototypeOf(proto))
      checkConnected(proto), checkDisconnected(proto), checkAttributeChanged(proto);
    const observed = getSuperTypesObservedAttributes(clazz);
    if (!observed)
      return defineOG.call(this, tag, clazz, ...args);

    const oaDef = Object.getOwnPropertyDescriptor(clazz, 'observedAttributes');
    const og = oaDef.get;
    oaDef.get = function () {
      return observed;
    }
    Object.defineProperty(clazz, 'observedAttributes', oaDef);
    const res = defineOG.call(this, tag, clazz, ...args);
    oaDef.get = og;
    Object.defineProperty(clazz, 'observedAttributes', oaDef);
    return res;
  }

  const defineOG = customElements.define;

  customElements.define = function firstDefinition(...args) {
    //first fix the HTMLElement.prototype so that it has its callbacks so super.connectedCallback() etc. don't fail
    if (!HTMLElement.prototype.connectedCallback)
      HTMLElement.prototype.connectedCallback =
        function disconnectedCallback() {
        };
    if (!HTMLElement.prototype.disconnectedCallback)
      HTMLElement.prototype.connectedCallback =
        function disconnectedCallback() {
        };
    if (!HTMLElement.prototype.attributeChangedCallback)
      HTMLElement.prototype.attributeChangedCallback =
        function attributeChangedCallback() {
        };
    //second, update with defineWithChecks.
    customElements.define = defineWithChecks;
    customElements.define(...args);
  }

})();

