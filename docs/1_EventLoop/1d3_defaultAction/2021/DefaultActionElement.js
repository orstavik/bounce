//addLastEventListener (bubble/at_target phase only, private access to this particular function).
//target => "eventName" => [target, type, cb, options]
const targetTypeLast = new WeakMap();

//return false, if already there, true if not and setLast is successful
function setLast(target, type, cb, options) {
  let typeToLast = targetTypeLast.get(target);
  !typeToLast && targetTypeLast.set(target, typeToLast = {});
  if (type in typeToLast)
    return false;
  typeToLast[type] = [target, type, cb, options];
  return true;
}

function getLast(target, type) {
  const typeToLast = targetTypeLast.get(target);
  return typeToLast ? typeToLast[type] : undefined;
}

const addEventListenerOG = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, cb, options) {
  addEventListenerOG.call(this, type, cb, options);
  const last = getLast(this, type);
  if (!last) return;
  EventTarget.prototype.removeEventListener.call(...last);
  addEventListenerOG.call(...last);
}

function addLastEventListener(target, type, cb, options) {
  const didSetLast = setLast(target, type, cb, options);
  const wrapper = function (e) {   //todo this is wrong. I need to use the implemented last:true event listener option.
    delete (targetTypeLast.get(target))[type];
    cb.call(target, e);
  }
  didSetLast && addEventListenerOG.call(target, type, wrapper, options);
}

//addLastEventListener ends


//lastPropagationNode not stressTested
function lastPropagationNode(event) {
  const path = event.composedPath();
  if (event.bubbles) return path[path.length - 1];
  if (!event.composed) return path[0];
  //non-bubbling and composed
  //We iterate top-down until we either hit a shadowRoot, or the bottom
  let top = path[path.length - 1];
  for (let i = path.length - 2; i >= 0; i--) {
    if (path[i] instanceof ShadowRoot)
      return top;
    top = path[i];
  }
  return top;
}


//
class ComposedPath extends WeakMap {

  extract(e) {
    const fullPath = this.get(e);
    this.delete(e);
    return fullPath;
  }

  zip(A) {
    this.set(e, ComposedPath.zipPaths(A, this.get(e)));
  }

  static zipPaths(A, B) {
    const res = [];
    let i = A.length - 1, j = B.length - 1;
    while (i >= 0 && j >= 0) {
      const a = A[i], b = B[j];
      if (a === b) {
        res.push(a);
        i--;
        j--;
      } else if (b instanceof ShadowRoot) {
        while (j >= 0 && b !== a)
          res.push(B[j--]);
      } else if (a instanceof ShadowRoot) {
        while (i >= 0 && a !== b)
          res.push(A[i--]);
      }
    }
    while (i >= 0) res.push(A[i--]);
    while (j >= 0) res.push(B[j--]);
    return res;
  }

  static make(target, composed, cutoffDocumentNode) {
    const path = [];
    while (true) {
      path.push(target);
      if (target === cutoffDocumentNode)
        break;
      const shadowRoot = target.parentNode?.shadowRoot; //todo bug, update the doc
      if (shadowRoot) {
        const slotName = target.getAttribute("slot") || "";
        target = shadowRoot.querySelector(!slotName ? "slot:not([name]), slot[name='']" : "slot[name=" + slotName + "]");
        continue;
      }
      if (target.parentNode) {
        target = target.parentNode;
      } else if (target.host) {
        if (!composed)
          return path;
        target = target.host;
      } else if (target.defaultView) {
        target = target.defaultView;
      } else {
        break;
      }
    }
    return path;
  }
}


//1. first time capture, no fullcomposedPath exists
//   a. add that fullComposedPath, check for sniffer 3, and if so add it.
//2. second time capture, only update fullComposedPath

//3. bubbleSniffer
//   a. if it is the lastPropagationNode and we have a fullPath, then delete the fullPath and run

const fullPaths = new ComposedPath();

function captureSniffer(e) {
  if (!fullPaths.has(e)) {                              //first time, then check if we need dynamic sniffer 3
    fullPaths.set(e, e.composedPath());
    const lastTarget = lastPropagationNode(e);
    if (lastTarget !== this)
      addLastEventListener(lastTarget, e.type, e => runDefaultActions(e, fullPaths.extract(e)), {once: true});
  } else
    fullPaths.zip(e, e.composedPath());
}

function bubbleSniffer(e) {
  fullPaths.has(e) && lastPropagationNode(e) === this && runDefaultActions.call(this, e, fullPaths.extract(e));
}

function runDefaultActions(e, fullPath) {
  const postPropagationPath = ComposedPath.make(fullPath[0], e.composed, fullPath[fullPath.length - 1]);
  for (let target of postPropagationPath.reverse()) {
    const defaultActions = getDefaultActionsForElementAndType(target, e.type);
    for (let {preventable, fun} of defaultActions) {
      if (preventable && e.defaultPrevented)
        continue;
      try {
        fun.call(target, e);
      } catch (err) {
        console.error(err);
      }
      if (preventable && !target.hasAttribute("additive"))     //todo should this be delegated to the defaultAction?
        e.preventDefault();                                    //todo no... think not...
    }
  }
}

function prototypes(bottom) {
  const res = [];
  for (; bottom; bottom = Object.getPrototypeOf(bottom))
    res.push(bottom);
  return res;
}

function mergeMapsOfArrays(accumulator, curr) {
  for (let key in curr)
    accumulator[key] = curr[key].concat(accumulator[key] || []);
  return accumulator;
}

function getDefaultActions(lowestClass) {
  return prototypes(lowestClass)
    .map(clazz => clazz.defaultActions)
    .filter(a => a)
    .reduce(mergeMapsOfArrays, {});
}

function getDefaultActionsForElement(el) {
  return getDefaultActions(Object.getPrototypeOf(el).constructor);
}

function getDefaultActionsForElementAndType(el, type) {
  const defaultActions = getDefaultActions(Object.getPrototypeOf(el).constructor);
  return defaultActions[type] ? defaultActions[type].map(({preventable, fun}) => ({preventable, fun, el})) : [];
}

export function makeDefaultActionElement() {
  return class DefaultActionElement extends HTMLElement {
    constructor() {
      super();
      const defaultActions = getDefaultActionsForElement(this);
      //memoize this method? That will make it impossible to change the default actions after element creation.
      for (let type of Object.keys(defaultActions)) {
        this.addEventListener(type, captureSniffer, true);
        addLastEventListener(this, type, bubbleSniffer);
      }
    }
  }
}