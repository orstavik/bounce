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

function nativeSlottingElements(el) {  //todo Htmlselect??
  return el instanceof HTMLAnchorElement || el instanceof HTMLDetailsElement || el instanceof HTMLHtmlElement;
}

function makeNativeShadow(el) {
  const root = new DocumentFragment();
  nativeSlottingElements(el) && root.appendChild(document.createElement('slot'));
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
  return assignedSlotOG.get.call(this) || (nativeSlottingElements(this.parentNode) ? this.parentNode.shadowRoot.children[0] : null);
}
Object.defineProperty(Element.prototype, 'assignedSlot', {enumerable: true, configurable: true, get: assignedSlotGet});

//todo I don't want to distinguish between elements here.
// const slotTypes = [HTMLAnchorElement, HTMLDetailsElement, HTMLHtmlElement];
// const hostTypes = [HTMLInputElement, HTMLTextAreaElement, HTMLButtonElement, HTMLOptionElement]; //todo exclude Option and instead do HtmlSelect as slotting?


//Rule 4. window.shadowRoot => document
// //        document.host => window
//        a) this doesn't affect rendering or slotting of Dom elements. It is above layout/paint in the Dom hierarchy.
//        b) all events that are natively dispatched on window, will now be dispatched on document! The onFirstEventListener callback must be updated.
//        c) window will now be a separate propagation context at the very top. This means that all event listeners on window will run at_target, *first*!!
//        d) document bubble listeners will now run last in the normal DOM.
//        e) composed: false in the main document will now point to document, not window.
//        f) we can now add default actions to window (ie. preventable event listeners on window.shadowRoot=>document).
//        g) the reason for this is that preventDefault() called on window listeners will now affect the event listeners on document.
//        h) event though preventDefault() runs on the window, it doesn't become possible to fix the issue because the preventable listeners
//           might run before the custom event listeners being added to the.
//        i) However, there is another option. We could say that event listeners for window always run in capture/bubble order.
//           Then preventable event listeners on window must be in bubble phase, and the event listeners calling preventDefault() must be in capture phase.
//           The drawback is that this is adding special rule  #2 to fix special rule #1, instead of just subtracting special rule #1.
//        j) a second alternative is to make the preventable event listeners always run last. But this only fixes issues on the window.
//           it doesn't fix any other issues with default actions for web components. So again, it will add special rule #2 to fix special rule #1.
//        conclusion: if we (window.shadowRoot===document + document.host === window), then we can make Mixins for window for event management.
//        this would make it much simpler to add/remove behavior such as error logging, because
//        it would now be a mixin that could be added/removed when devtools is opened/closed.
//        this solution could also be patched to move the bubble event listeners after document bubble listeners in case you want backward compatibility.

// Object.defineProperty(window, "shadowRoot", {value: document, configurable: false, writable: false});
// Object.defineProperty(document, "host", {value: window, configurable: false, writable: false});

//todo the drawback of this structure is that it doesn't give a declarative view. We can't in the DOM and the HTML rendition of the DOM see which default actions apply. We have to inspect the window and/or document from JS.
//todo this is really bad. If we had it as a slotting relationship around the html node, then we could easily see that the html node was augmented.
//     the html node is really such a slotting node for default actions. There is no other purpose of the HTML node, than an event listener <a href> kinda
//     element.
//     if we used the html element as the target, we only get an additive rerouting of window events from the window to the html element shadowRoot.
//     Then, if we want to extend such events visible in html, then we simply replace the html element with another html-plus-plus element.
//     In reality, we can't do this as new custom elements, so for the html element, we would need to do so as attributes.
//     We would add it as attributes, and then add an attributeChanged observer to html element, and then every time those attributes change,
//     we would add/remove the listeners to the shadowRoot.
//     <html>.shadowRoot.<slot>.<body> would be the new set up.
//     and then all native window events would be rerouted to <html>.shadowRoot.
//     after this point, adding event listeners to window(??) is no longer needed?? window can in principle be removed as an EventTarget??
//     dispatching events to window should also be discouraged?? yield a warning??
//     It is a strange target, <html>.shadowRoot.. It is not what I would expect.. To change target from window to <html> is not that strange.
//     when we call dispatchEvent(e), on an element, then maybe they should by default always be rerouted to the shadowRoot? Unless {hostNodeOnly: true}?
//     or {noDefaultActions: true}? hm... I think that this is a good rule.
