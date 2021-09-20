# WhatIs: `HTMLElement`?

In JS, the HTMLElement is implemented as a regular `class`. That is nice. The `class` structure is familiar to many JS developers, and so the idea is that by aligning the structure of `HTMLElement` types to that of `class`, we get a simple, non-intrusive concept.

## WhyAndWhat: `HTMLElement` constraints?

But. `HTMLElement`s are not regular objects. They operate in a specialized context: the DOM. They also exist not only in JS, but also in **HTML**. Therefore `HTMLElement`s are constrained not only by the requirements of JS `class`, but also of those of the **DOM/HTML**.

In practice, the DOM/HTML constraints of `HTMLElement`s shows itself in *two* ways:

1. You *must* `define` an new `HTMLElement` `class` as a `customElements` *before* you can `constructor()` it. Why? Because the `HTMLElement` `class` must be given an HTML `tagName` in a particular DOM context. If not, you could for example get *two* different `HTMLElement` sub-classes with the same `tagName` or add an element to the DOM that didn't have a `tagName`. Both of which would break fundamental DOM/HTML principles and not compute. So, before the JS `class` is ready, the HTML element must also be made ready by assigning it a `tagName` unique in the DOM.

2. Life cycle methods such as `connectedCallback()` and `attributeChangedCallback(..)` will be called by the DOM engine when they change. Why? `HTMLElement` can be *constructed* not only from JS, but also from HTML template text. This means that `attributes`, `childNodes`, and `parentNode` *can* be set on an `HTMLElement` object from some other dimension that JS code. And that means that for code in the JS dimension to learn about and react to such changes, some JS functions must be called(back). 

	> Interaction with HTML template is why the JS `HTMLElement` `class` *needs* to have callback methods and be reactive. But, there are many conceptual benefits to having callback methods and behave reactively *within* JS land as well, so this *need* of interaction from HTML to JS also becomes a *benefit* of interaction from one JS module to another.

## WhatIs: HTML element construction

HTML element objects can be constructed in 7 ways:
1. predictive parser
2. upgrade
3. upgrade from a sync script within the web component
4. `innerHTML` and `insertAdjacentHTML`
5. `cloneNode`
6. `document.createElement`
7. `new HTMLElement()`

Each one of these JS functions/HTML template mechanisms trigger the process we can call HTML element construction. The `new` mechanism will always create a blank HTML element, ie. an HTML element with neither `attributes`, `childNodes`, `parentNode`. However, all the other construction mechanisms will create HTML elements *with* `attributes`, `childNodes`, `parentNode`.

This means that the "HTML element construction process" isn't limited to the `constructor()`, but *might* also includes compulsory calls to `attributesChangedCallback()`, `connectedCallback()`, and `slotchange` events.

When the HTML element is created by the predictive parser, a DOM restriction states that the `constructor()` should be called *before* the `attributes`, `childNodes`, and `parentNode` is associated with the `HTMLElement`. This means that the `constructor()` should neither *read* nor *write* neither `attributes`, `childNodes` or `parentNode`/ancestor context. And so, to support "predictive parser HTML construction" an **extra restriction** is added to the `HTMLElement.constructor()`: the **DoNotWriteInConstructor**.

## Problem: Bad DoNotWriteInConstructor restriction

The DoNotWriteInConstructor explicitly specify that the `HTMLElement.constructor()` cannot write `attributes` nor`childNodes`. And the idea is that this should prevent race conditions when a.o. the predictive parser calls the `constructor()` *before* it has added neither `attributes` nor `childNodes` to the `HTMLElement` instance.

But. The DoNotWriteInConstructor is *inconsistent* and *disabling* and therefore *bad*. We start with the *inconsistency*.

### Problem 1: inconsistent `HTMLElement.constructor()`

Sometimes when `HTMLElement.constructor()` is called, the `attributes` and `childNodes` are already parsed and added to the `this` object. This happens when the element is constructed via `innerHTML`, `insertAdjacentHTML`, upgrade, or `cloneNode`. This means that from inside the `constructor()` three different scenarios can exist:
1. *all* the `attributes` and `childNodes` defined in template have been parsed and can be *read*, but not written to.
2. *all* the `attributes`, but only *some* of the `childNodes` can be *read*, but not written to (this happens during upgrade from sync script within web component).
3. *none* of the `attributes` nor `childNodes` defined in template can be read.

First. If a developer sees that `attributes` can be read in one call of his `HTMLElement.constructor()`, then it is very easy for that developer to make the assumption that `attributes` are always readable from the `constructor()`, and that if there are none, then the HTML template did not define any. Which would be consistent behavior. But which is currently not true.

Second. The same inconsistency that applies to `attributes` and `childNodes` are also true of `parentNode`: the `HTMLElement.constructor()` in predictive parser will return `null` for `parentNode`, even though a `parentNode` is specified in the HTML template. Furthermore, there is *no* writing restriction for `parentNode` even though this part of the context cannot be guaranteed as ready in the same as `attributes` and `childNodes` are not yet ready in the `constructor()`. This means that one *could* append an `HTMLElement` to another DOM node during construction because the developer is mislead to believe that the `HTMLElement` is constructed without `parentNode`.

### Problem 2: disabling `HTMLElement.constructor()`

The restriction DoNotWriteInConstructor makes sense from the perspective of the `HTMLElement.constructor()` in isolation: 
1. `attributes` and `childNodes` are read and constructed from HTML template first, and you can only add `attributes` and `childNodes` from JS once this is complete. 
2. Because of the rules and sequencing of lifecycle callbacks in the predictive parser (and upgrade from within process), the `HTMLElement.constructor()` can be called *before* the HTML template `attributes` and `childNodes` are added to the element.
3. To avoid a race condition here, `attributes` and `childNodes` cannot be written during the `HTMLElement.constructor()`.

Sure. Fine. But then when would you write default or context sensitive `attributes` and `childNodes` during the construction process?

The gut, immediate response from a know-it-all mega-super-i-am-god-developer would be: "you don't". You don't write `attributes` or `childNodes` to a web component during construction. The default attribute value for *any* attribute would be undefined, and the default `childNodes` should be empty (the inner shadow of a web component should not create dom nodes in the lightDom).

Now, there is definitively truth in the above assertion. The golden rule "don't add child nodes to the host node" is likely so *golden* that it can stay. And its sibling golden soft rule, "don't change the position of the host node in the lightDom" should be consistently kept, so that there is no problem that there is no hard restriction against doing so in the `HTMLElement.constructor()`.   

But. This is not the entire truth. And so ending the argument here is naive. And here is why:
1. Logic (JS functions/methods) inside an HTML element, do also *need* to *proactively* communicate to the lightDOM about the state of the element.
2. The common ways to do so would be to a) dispatch an event and b) write to an attribute on the host node that will directly trigger changes in CSS and `attributeList MutationObserver`s in the  lightDOM.
3. `attributes` is a "shared" space between the lightDOM and shadowDOM.

Having established that functions/methods inside an HTML element can write to attributes, one question remains: should an HTML element *always* write only default attribute values during the construction process?

No. And to illustrate, we will present the following use-case. Imagine an HTML element that apply special significance to a value in the JS landscape, for example a test component that uses the `performance.now()` to signify how long it has taken since the page started loading: A `performance.now() < 500` is green, `performance.now() > 1500` is red, in between is yellow. The element would like to gauge this JS landscape property to set a property `status` on itself that could directly be converted into say `[status="green"]{color: green}` in the CSS of the lightDOM.

Now, it is easy to get confused here. Why can't `[status="green"]` be the default value? Sure, it can. That is not the problem, the problem is: when the `constructor()` discovers that `[status="red"]`, how does it write it to the host node?

Why can't we just make the requirement that you cannot construct this particular HTML element without a `status` attribute? Why can't we just apply a soft, semantic rule that says you always write `<test-element status>` to trigger an `attributeChangedCallback(..)` for the custom element? Now, that is bad because the "default value " of any HTML attributes is nothing, remember? How would then `document.createElement("test-element")` work for example?

No matter where you start pulling on this ball of yarn, the conclusion always ends up with the *need* of having some callback in the construction process where you a) know that all attributes set in HTML template is parsed and added to the element and b) *can* write to the host node attribute. 

Thus, the DoNotWriteInConstructor restriction is disabling because it doesn't provide a later `constructor_part_2()` callback where the developer of the HTML element can specify startup values for one or more attributes on its host node.

## Problem 3: construction callback race condition

Depending on the construction mechanism used, and how that construction mechanism is used, an element's `constructor()`, `attributeChangedCallback()`, `connectedCallback()`, and `slotchange` events may or may not be called, and follow slightly different timing rules. We will try to list *some* of the quirks here:
  
### Predictive parser

1. When the predictive parser is called, it will run first the `constructor()`, then *maybe* `attributeChangedCallback()`(s), and then *always* a `connectedCallback()`. The predictive parser will only run `attributeChangedCallback()` iff the element has any observed attributes set in HTML template.
2. The predictive parser will run each of these callbacks as a macro task, meaning that any micro-task initiated by the `constructor()` will run *before* any `attributeChangedCallback()`, and micro tasks from `attributeChangedCallback()` will run before `connectedCallback()`.
3. The `childNodes`  will *not* be added during *none* of these callbacks. To read `childNodes` for elements constructed by the predictive parser would most likely be implemented using an event listener for `DOMContentLoaded`.

### Upgrade

1. The upgrade mechanism will also *always* run `constructor()`, *maybe* `attributeChangedCallback()`, and *always* `connectedCallback()`.
2. However, during the `constructor()` triggered by an upgrade, both `parentNode`, `isConnected`, `attributes`, and `childNodes` can be read.
3. Furthermore, the upgrade will not give each callback a macro-task, so any micro-task triggered by the `constructor()` will run *after* the `connectedCallback()`.
4. Finally, there is an edge case when a sync `<script>` defines a custom element inside the element itself: `<web-comp>hello<script src="defineWebComp.js"></script>sunshine</web-comp>`. In such "define from within" upgrades, the child list of the host node is in an *incomplete, partial* state (it is not only void or ready, as it would be in other normal contexts).

### `cloneNode`

1. `cloneNode()` mechanism will also *always* run `constructor()` and *maybe* `attributeChangedCallback()`, but it will *never* trigger `connectedCallback()`. This means that the `connectedCallback()` method must either a) *not* be considered part of the construction process or b) that element objects may exist that are not-yet-fully-constructed.
2. When constructed, the `attributes`, `childNodes`, and `parentNode` can be read (the root node will not have `parentNode = null` and the nested elements will have a regular `parentNode`).
3. In terms of macro-/micro-task queueing, `cloneNode` follows the same sync behavior as upgrade.
4. The big issue with `cloneNode` is that you *can* get only *one* JS callback: the `constructor()`. When an element with no observed attributes are cloned, then that element will *only* get its `constructor()` called. This means that we might **not** get a second callback in which we can *write* attributes to the host node. 

### `innerHTML` and `insertAdjacentHTML`

> In this context, `insertAdjacentHTML` and `innerHTML` behave identically. Therefore, we use only `innerHTML` to refer to both `insertAdjacentHTML` and `innerHTML`.  

1. `innerHTML` also *always* run `constructor()`, also *maybe* `attributeChangedCallback()`, but ***maybe*** `connectedCallback()`. `innerHTML` can be applied to elements and `ShadowRoot`s that are not connected to the DOM, and when this is the case, `connectedCallback()` will **not** be triggered (yet).
2. This means that the context of the `constructor()` of `innerHTML` can be *indistinguishable* from upgrade or `cloneNode` two things. 

### `new HTMLElement()` and `document.createElement()`

> In this context, `new HTMLElement()` and `document.createElement()` behave identically. Therefore, we use only `new` to refer to both `new HTMLElement()` and `document.createElement()`.

1. When we call `new` we of course run the `constructor()`, but *never* `attributeChangedCallback()`, and *never* `connectedCallback()`.
2. This means that we do **never** get a second callback in which we can *write* attributes to the host node.

# Making sense of the HTML element construction race condition

## Solution 1: make arguments to constructor invalid

Because `HTMLElement`s should be constructed in the same way in both the HTML and the JS world, then arguments to `HTMLElement.constructor()` should be made illegal. You cannot add such arguments when you create the element from HTML template.

## Solution 2: `readyCallback()`

We start by making some assumptions:

1. The hard restriction DoNotWriteIn`HTMLElement.constructor()` cannot be undone. Even if we delayed all definitions of custom elements until after `DOMContentLoaded` and thus removed predictive parser mode from custom elements, we would still not be able to monkeypatch away the hard restriction preventing us from writing `attributes` in the `constructor()`. Thus, DoNotWriteIn`HTMLElement.constructor()` must remain in place.

2. But, we still need a JS method inside an HTML element to write attributes to the host node during the construction process. We cannot simply overlook this use-case, it is too important for proper web component modulation and construction.

3. There are several strategies for such a second `constructor()`:
   1. a `readyCallback()` that is called when the attributes on the element is fully parsed and added to the element (not from within the `constructor()` frame).
   2. a `disconnectedCallback()` or `connectedCallback(false)` or some other kind of connectedness callback to replace the missing `connectedCallback()` for `cloneNode`, `new`, and `innerHTML` on a disconnected node.
   3. an empty `attributeChangedCallback(..)` for elements constructed with an empty set of attributes.

    The empty `attributeChangedCallback(..)` and `ready()` callbacks are better than the `(dis)connectedCallback(false)`, because they better reflect the need of the callback: write access to `this.attributes`. They also provide better timing, as we need the process of constructing attributes before or at the head of `attributeChangedCallback()`s. 

    The choice then falls on a `readyCallback()` that should be triggered *before* the first `attributeChangedCallback()`, or *before* the first `connectedCallback()` or *in the same frame* as the construction callback mechanism itself.

4. The requirement of the `readyCallback()` leaves us with a predicament: we cannot allow the construction of HTML elements that do not afford us a second callback. We somehow need to make the mechanisms that construct HTML elements give us a second callback, or we need to make those mechanisms for HTML element construction illegal.
   1. We then need to monkeypatch `document.createElement(..)`, `cloneNode`, `innerHTML`, `customElements.define`/upgrade, and the `attributeChangedCallback()`/`connectedCallback()` in predictive parser mode to provide us the missing `readyCallback()`/constructor part 2.

## Solution 1b+2b: NoMore*New*

Because `new` doesn't give us *any* mean to create a second callback during the construction process where we can *write* attributes, we need to make calls to `new` illegal. This also means that there is **no longer** any way to construct `HTMLElement` objects that *can* accept constructor arguments. Thus, making `new` construction illegal also make `constructor()` arguments invalid. As they should be.

## Solution 3: `slotchange` 

There are several inconsistency and timing issues with `slotchange` event: 
1. You can get `slotchange` for nested `<slot>` elements in SlotMatroschkas. This can easily cause confusion if somebody else reuse your web component in their web component. 
2. You don't get a `slotchange` if your web component doesn't have a `<slot>`. This means that you have to construct a shadowRoot for your web component event if all you want to do is observe your childNodes. And this means that you cannot construct your shadowRoot when it is needed, but before it is needed. The default being empty is not possible. 

To bypass these issues, we instead create two different callbacks:
1. `childChangedCallback()` and 
2. `visibleChildChangedCallback()`

These callbacks are dependent on the element being connected to the DOM. That means that they are not constructed until the `connectedCallback()` is made.

## WhatAndWhy: inheritance?

What is `super`? What is good in life? What is a life-cycle method? And what is the meaning of life? Why do we "override" methods in classical OO? What does it mean to copy or divert from the behavior of your ancestors? Big linguistic and philosophical and technical questions. It is time to think.

Let's start! What is `super`? Imagine a `class Bob` that `extends Alice`. `Bob` is the base class, `Alice` is the `super` class. When you inside a method of `Bob` write `super.something`, you are referring to the `.something` property on `Alice`. If you inside the `constructor()` method in `Bob` write `super()`, you are referring the `constructor()` of `Alice`. In the `constructor`, then `super` means `Object.getPrototypeOf(this).constructor` and inside other methods, then `super` means `Object.getPrototypeOf(Object.getPrototypeOf(this))`. Todo. Find the exact definition here. 

What is life-cycle method? A life cycle method is a method on an object that the run-time calls for you whenever an object enters a new life cycle stage. The default in JS is to have a *single* life-cycle method for each `class`: the `constructor()`. But, as `HTMLElement` illustrate, different environments can require additional life-cycle methods such as `connectedCallback()` and `attributeChangedCallback()`.

What does it mean to *override*? If both `Bob` and `Alice` implement `methodAB()`, then `Bob`'s version of `methodAB()` would *"override"* `Alice`'s version of `methodAB()`. So, if somebody called `.methodAB()` on a `Bob` object, then they would *only* get `Bob.methodAB()` and *not* `Alice`'s version of `.methodAB()`. To "override" means that if there are two methods with the same name on ancestor and descendant `class`, we only get the version of the descendant. And, in normal JS, this is a big part of what `extends` means: `extends` means properties with the *same* name in two classes, then you will only get the "lowest" version.

But. Sometimes we need to "aggregate" methods. Enter `constructor()`. The `constructor()` in `Bob` also override the `constructor()` in `Alice`, but for OO as a principle to work, it is important that the `constructor()` for *both* the base and the super class run. And that the `constructor()` of the super class run *before* the `constructor()` of the base class (as the base class might need some of the properties that the super class `constructor()` has initiated). There is no law in nature or physics that says we must aggregate `constructor()`s. Or that we *must* run the super before base `constructor()`. As there is no law in nature that says OO is a good thing. But, with lots of trial and error, most people are convinced/brainwashed to think that OO is good and that it works best when we always aggregate `constructor()`s, super before base.

Therefore, classical OO stipulate that:
1. override is the basic principle of same name methods,
2. override behavior is implemented syntactically (ie. hidden in the word `extends` and `super` so to speak), and that
3. aggregate is done manually, by using the `super` keyword, and finally that
4. `constructor` method is given a special semantic rule that require it to call `super(..)` at its very beginning. This is the normal JS, Java style OO, the best case compromise where the override needs of the many methods balance the aggregate need of the `constructor()` "perfectly".

This balance of different needs of different types of methods, this is why "we" chose to "override automatically, aggregate manually". But, "we" could just as easily have turned the tables, and declared that the basic principle of `extends` is to aggregate all methods (ie. run *all* methods with this name from super class down to base class), and then manually declare `break` or something when we wished to override.

So, what if you find yourself in an environment where your classes:
1. *never* had to pass arguments to the `super()` constructor, 
2. you have almost *no* methods that you wish to *override*, and
3. you have many *life-cycle* methods that you wish to aggregate.

In such a scenario, you a) almost don't need `super` and b) you wish to *reverse* the override=>aggregate meaning of `extends`. You want class inheritance mean aggregate methods, you want your aggregation run seamlessly (ie. without `super.whatever(...)` boilerplate). You want certainty that any subclass *always* calls your life-cycle callback first, as if it was a `constructor()`.

## solution 5b: life-cycle inheritance

And. This is the world of `HTMLElement`s. HTML elements need to function in two different worlds at the same time: HTML and JS. Therefore, the code of `HTMLElement`s are mostly reactive: you respond to *life-cycle* callbacks such as `constructor()`, `connectedCallback()`, `attributeChangedCallback()`, and events such as `slotchange` and `click` etc. If you wish to share behavior between two HTML element types, you need to share these "reactions". You need to share life-cycle callbacks. And as the `constructor()` life-cycle method, this only works when you *aggregate*, not override.

Furthermore, all these life-cycle callbacks have a statically fixed set of arguments. Furthermore, some of these arguments need to be calculcated on a per `super` class basis: you don't want to call a `super` class `attributeChangedCallback()` if the `super` class doesn't observe that attribute name.

And so, to make OO useful for `HTMLElement`, we therefore need to change the meaning of `extends HTMLElement`. We do *not* change any of the syntactic premises of the `constructor()` as this is locked deep inside the language. But, we make the life-cycle callbacks `connectedCallback()`, `disconnectedCallback()`, `attributeChangedCallback()` **aggregate by default**.

Furthermore, we make this aggregation implicit, not using `super.connectedCallback()` for example. The reason for this is the `attributeChangedCallback()`. The `attributeChangedCallback()` is controlled by the `static get observedAttributes()`, and this method should control which attributes should trigger each `class`' `attributeChangedCallback()`. To require the developer to implement a `super.attributeChangedCallback()` that filtered out `super.constructor.observedAttributes` would be extremely complex as the `static get observedAttributes()` is associated with the `constructor` outliers in the prototype-chain and therefore must query each prototype individually. This complexity, combined with the fact that you *never* need to set arguments to any of the `HTMLElement` lifecycle calls, and always wish to run them first (same as `constructor()`), tips the scales into reversing the aggregate vs override scales to **break syntactic conventions**. 

## References

 * omg, where to begin;) 