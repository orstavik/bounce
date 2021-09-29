# WhyWhenAndHowTo: `shadowRoot...addEventListener()`?

Event listeners inside the shadowRoot of a web component is essentially the same as a default action. They add interactive behavior to web components. And they enable developers to modularize interactive logic and encapsulate it HTML semantic words, elements. This is the second most important use-case for web components, second only to structuring layout (/style). 
                          
## Behavior by default 

Some `<web-comp>` can have such interactive behavior attached by default. For example, the `<details>` will by default listen for `click` events on the first `<summary>` child node.

Such a `<web-comp>` should add such an event listener in its `constructor()`.

But! Best-practice is to *always* enable the *user document* (ie. lightDom) to control *all  interactive behavior* of *all its elements*. And control of event listeners in a `<web-comp>` should be done **via an `attribute`, and not a `.method()`**.

This means that whenever you add an event listener to a web component in its `constructor()`, you should at the same time enable it to be *removed* whenever a specific "off"-`attribute` is set. You make the name of this "off"-`attribute` as it should be associated with the behavior, such as `no-click`, `disabled` or `inactive` or something similar. 

Note! Many/most of the native elements break this practice. Unfortunately. For example, the `<details>` element do not provide any attribute, nor method, that will turn *off* the ability to open/close. This limits the reuse of it. The best practice is to enable such control. So, when you are making your new and better web components, you can do better. If you add behavior by default, add an `attribute` that enable the lightDom to disable one or more such event listeners.
                               
The "off"-`attribute` will technically be implemented using `static get observedAttributes` and `attributeChangedCallback()`. When the "off"-`attribute` is added, then `shadowRoot...removeEventListener()`; when "off"-`attribute` is removed, then `shadowRoot...removeEventListener()`.  
                                                                             
## Behavior when `attribute` present 

Some `<web-comp>` only have such behavior when a particular `attribute` is set. For example, the `<a>` element will only have `click` event listeners added when `href` attribute is set: `<a href="...">`.

Such a `<web-comp>` should only add and remove its event listeners using `static get observedAttributes` and `attributeChangedCallback()`.

## How to add/remove event listeners efficiently?

In a `<web-comp>`, you should commonly be able to trigger the same functionality by calling a method on a component from script as from an event. Thus, the internal event listeners should point to a corresponding method on the element. That way, you have two routes to the same behavior:
1. JS => hostNode.method(), or 
2. event => shadowRoot...eventListener => hostNode.method()

However, event listener is often added/removed from the eventListener using an `attributeChangedCallback()`: if an attribute is present or not an empty string, then a `shadowRoot...eventListener` should be added (or removed), and if the same attribute is removed or set to an empty string, then a `shadowRoot...eventListener` should be removed (or added). However, `attributeChangedCallback()` will also trigger if an `attribute` value changes from two different non-empty string values, aka. changing `<web-comp href="bob">` to `<web-comp href="alice">` will also trigger an `attributeChangeCallback()` if `<web-com>` observe attribute `href`.

The trick here is to simply have the same closure object for event listener function. If this happens, then any secondary call to `shadowRoot...eventListener()` will simply be disregarded, you will never get two callbacks for the same event.

> Note, caching and using such event listener closures is not a performance, but convenience trick. 

## EventListeners during "loading"

There is really not much point in having event listeners during "loading". The "loading" period is not for dispatching events. We here disregard `slotchange` events, as those are broken during predictive parser.

There are no UIEvents flying, no `offline/online`, no `readystatechange` events flying *during* predictive parser. And sync `<script>`s should definitively *not* dispatch events during loading.

Hence, no event listeners need to be added during predictive parsing. They only need to be added at the very beginning of dom interactive. But. To mess around with attributeChangedCallback like this would likely be more problematic than simply adding them, so we don't delay.

The basic principle is that there is no rush nor FOUC during predictive parser with adding event listeners, like there is with creating shadowDom, so the web component developer can relax and just add event listeners from `attributeChangedCallback()`.

## EventListeners: in `connectedCallback()`?

The answer is no. Here is why: 

The cost of event listener objects is small. For elements not connected to the DOM, they are not queried when the element is not in the DOM. There is no real performance gain to be had taking event listeners up and down when elements go in and out of the DOM.

The state of the element should be recognizable *without having to query if the element `isConnected` or not*. The element should signal in HTML template its state, via attributes, and not via `isConnected`. Having a soft rule involving an otherwise irrelevant `isConnected` is just causing confusion.

So. In principle, *both* `<details>` and `<a href="something">` elements should have event listeners attached when not in the DOM. And `<details>` should `open` and close if you `dispatchEvent(new MouseEvent('click'))` on it, even when it is not in the DOM. The `<a href="something">` should also react to a `dispatchEvent(new MouseEvent('click'))`, but the `<a href="something">` might have additional checks preventing it from actually doing navigation for example.

Some elements have behavior that check `isConnected`. And these elements *can* make their event listeners *slightly more efficient* if they also set/remove event listeners during (`dis`)`connectedCallback()`. However, this is not the *basic architecture*. Event listeners are *primarily* taken up/down with `attribute` changes; taking event listeners up/down based on (`dis`)`connectedCallback()` is only a minor performance gain for a select few elements.

## conclusion
                                                                                          
1. Event listeners are set/removed using `attributes`.
2. When an element has an event listener set by default, that event listener is added in the `constructor()`.
3. Event listeners set by default should have an "off"-`attribute`.
4. Event listeners should point to a method on the host node.
5. Sometimes you need to parse the events properties in order to filter out some events or turn those properties into arguments for the host node method.
6. You cache the closure you set as event listener in the HTMLElement in order to enable simple attributeChangeCallback reactions, *not for performance gains*.