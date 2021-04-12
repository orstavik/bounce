import {makeDefaultActionElement/*, analyzeDefaultActions*/} from "./DefaultActionElement.js";
function makeSlotchangeCallbackClass(){
  return class SlotchangeCallback extends HTMLElement{
    constructor() {
      super();
      console.log("slotchangeCallback should now be supported");
    }
  }
}

//returns the topDown list of super classes excluding Object
function superClassList(subClass, cutoffClass) {
  const res = [];
  for (subClass; subClass !== cutoffClass; subClass = Object.getPrototypeOf(subClass))
    res.push(subClass);
  return res.reverse();
}

function injectSuperClassIfNeeded(classes, testFun, createClassInstanceFun) {
  const i = classes.findIndex(testFun);
  if (i === -1)
    return;
  const newSuper = createClassInstanceFun();
  Object.setPrototypeOf(newSuper, classes[i - 1]);
  Object.setPrototypeOf(classes[i], newSuper);
  classes.splice(i, 0, newSuper);
}

const defineOG = CustomElementRegistry.prototype.define;

export const define = CustomElementRegistry.prototype.define = function define (name, original, options) {
  const classes = superClassList(original, Element);

  //upgrade/mutate the class hierarchy
  injectSuperClassIfNeeded(classes, clazz => clazz.defaultActions, makeDefaultActionElement);
  injectSuperClassIfNeeded(classes, clazz => clazz.prototype.slotchangeCallback, makeSlotchangeCallbackClass);

  // analyzeDefaultActions(original); //no longer needed.. We do this in the constructor of the DefaultActionElement class
  defineOG.call(this, name, original, options);
}