(function () {

  window.ActionAttribute = class ActionAttribute extends Attr {
  };
  EventTarget.injectInterface(ActionAttribute.prototype);
  //Object.defineProperty(EventTarget.prototype, "injectInterface", {value: undefined});
  // todo should we lock the injectInterface at this point? no.. We need a set of locks *after* the creation of the runtime,
  //  very much the same as we are deprecating many methods at the beginning of our script.
})();