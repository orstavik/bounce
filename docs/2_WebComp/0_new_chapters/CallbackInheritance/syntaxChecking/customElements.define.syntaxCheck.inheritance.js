//add syntax checking for correct lifecycle inheritance implementation in a native JS HTMLElement class.
(function () {
  const callSuperRegex = /^([^(]+)\(([^)]*)\)\s*{\s*super\s*.\s*([^(]+)\(([^)]+)\)/m;

  function prototypes(proto, stopProto) {
    const res = [];
    for (proto = proto.prototype; proto !== stopProto; proto = Object.getPrototypeOf(proto))
      res.push(proto);
    return res;
  }

  function callSuper(fun) {
    const funTxt = fun.toString().trim().replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, ''); //remove comments
    const match = callSuperRegex.exec(funTxt);
    if (!match)
      return false;
    let [declareName, declareArgs, callName, callArgs] = match.slice(1).map(m => m.trim());
    if (declareName !== callName)
      throw new SyntaxError(`${declareName}() must call 'super.${declareName}()', and not 'super.${callName}(...)'.`)
    callArgs = callArgs.replaceAll(/\s+/g, '');
    if (callArgs === '...arguments')
      return true;
    declareArgs = declareArgs.replaceAll(/\s+/g, '');
    if (callArgs === declareArgs)
      return true;
    //wrong arguments, callArgs doesn't match declareArgs or ...arguments.
    throw new SyntaxError(`${declareName}(${declareArgs}) must call either 'super.${declareName}(${declareArgs})' or 'super.${callName}(...arguments)'.`)
  }

  function checkCallback(protos, callback) {
    const connected = protos.filter(p => p.hasOwnProperty(callback) && p[callback] instanceof Function);
    if (!connected.length)
      return 0;
    const origin = connected.pop();
    if (callSuper(origin[callback]))
      throw new SyntaxError(`calling super.${callback}() on top`);
    for (let base of connected) {
      if (!callSuper(base[callback]))
        throw new SyntaxError(`${(base.constructor.name)}.${callback}(...) must call super.${callback}(...) as its first call.`);
    }
  }

  function checkObservedAttributes(protos) {
    protos = protos.filter(p => p.constructor.hasOwnProperty('observedAttributes'));
    for (let {constructor: base} of protos) {
      if (!(base.observedAttributes instanceof Array))
        throw new SyntaxError(`${base.name}.observedAttributes doesn't return an Array.`);
      if (!base.observedAttributes.every(s => typeof s === "string" || s instanceof String))
        throw new SyntaxError(`${base.name}.observedAttributes return an Array with a non-string element.`);
    }
    for (let i = 0; i < protos.length - 1; i++) {
      const base = protos[i].constructor;
      const baseOA = base.observedAttributes;
      const supa = protos[i + 1].constructor;
      const supaOA = supa.observedAttributes;
      for (let sup of supaOA) {
        if (baseOA.indexOf(sup) >= 0)
          continue;
        const correctList = [...baseOA, ...supaOA].filter((s, i, ar) => ar.indexOf(s) === i);
        throw new SyntaxError(`${base.name}.observedAttributes does not include ${sup}. Try:
  static get observedAttributes(){ 
    return ${JSON.stringify(correctList)};
  }`);
      }
    }
  }

  const lifecycleCallbacks = ['connectedCallback', 'disconnectedCallback', 'attributeChangedCallback'];
  const defineOG = Object.getOwnPropertyDescriptor(CustomElementRegistry.prototype, "define");
  Object.defineProperty(CustomElementRegistry.prototype, "define", Object.assign({}, defineOG, {
    value: function define(tag, def) {
      const protos = prototypes(def, HTMLElement.prototype);  //1. simplify the prototype chain
      for (let cb of lifecycleCallbacks)                      //2. check the signature of the callbacks
        checkCallback(protos, cb);
      checkObservedAttributes(protos);                        //3. check observedAttributes aggregation
      defineOG.value.call(this, tag, def);                    //4. if nothing fails, register definition
    }
  }));
})();