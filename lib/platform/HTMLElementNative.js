
//why is attachShadow() on HTMLElement prototype, while .shadowRoot getter/setter is on Element prototype?

//Rule 1: attachShadow is always open.
//        This is necessary to inspect for native default actions inside the shadowRoot of a closed component
const attachShadowOG = HTMLElement.prototype.attachShadow;
Object.defineProperty(HTMLElement.prototype, 'attachShadow', {
  value: function (options) {
    return attachShadowOG.call(this, {mode: "open"});
  }
});

//Rule 2a: All native elements with PREVENTABLE or PREVENTABLE_SOFT default actions must have a shadowRoot.
//        By giving these elements a shadowRoot, we can create the correct bounced path for such elements in the event loop.
//or
//Rule 2b: all elements has a shadowRoot. And this shadowRoot will be presented when it is ready.
const shadowRootOG = Object.getOwnPropertyDescriptor(Element.prototype, "shadowRoot");
const nativeShadows = new WeakMap();

function makeNativeShadow(el) {
  const root = new DocumentFragment();
  if(el instanceof HTMLAnchorElement || el instanceof HTMLDetailsElement)  //todo Htmlselect??
    root.appendChild(document.createElement('slot'));
  root.host = el; //todo do we need to Object.defineProperty(root, 'host', {value: el, ...}); ??
  return root;
}

//todo we could here make the native DocumentFragments have a method that checks for native default action.
//if that is the case, then we could simply ask the ShadowRoot if it has nativeDefaultAction, and then if true,
//we make a decision about whether to call native preventDefault or not.

function shadowRootGet() {
  let root = shadowRootOG.get.call(this) || nativeShadows.get(this);
  !root && nativeShadows.set(this, root = makeNativeShadow(this));
  return root;
}
Object.defineProperty(Element.prototype, 'shadowRoot', {enumerable: true, configurable: true, get: shadowRootGet});

//Rule 3: assignedSlot
//        all Elements might be slotted inside a native element. and if they are, then they have a native assigned slot (really).
//        however, this might cause some confusion... Should this property be updated when that is not really the case? I think maybe yes..
const assignedSlotOG = Object.getOwnPropertyDescriptor(Element.prototype, "assignedSlot");
function assignedSlotGet() {
  return assignedSlotOG.get.call(this) || nativeShadows.get(this)?.children[0] || null;
}
Object.defineProperty(Element.prototype, 'assignedSlot', {enumerable: true, configurable: true, get: assignedSlotGet});

//todo I don't want to distinguish between elements here.
// const slotTypes = [HTMLAnchorElement, HTMLDetailsElement];
// const hostTypes = [HTMLInputElement, HTMLTextAreaElement, HTMLButtonElement, HTMLOptionElement]; //todo exclude Option and instead do HtmlSelect as slotting?