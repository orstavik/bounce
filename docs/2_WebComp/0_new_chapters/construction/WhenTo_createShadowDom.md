# WhenTo: create shadowDom?

The content in the `shadowRoot` can be added at different points:
1. `constructor()`,
2. first `attributeChangedCallback()`,
3. `attributeReadyCallback()`,
4. first `connectedCallback()`,
5. `childReadyCallback()`,
6. first `childChangedCallback()` 

## Anti-pattern: create shadowRoot from `connectedCallback()`

First, we discredit `connectedCallback()` as an alternative. In most use-cases for layout web components, the layout/content/style of an HTML element is not dictated by its parent context. Therefore, we have little interest in waiting for parent before creating the shadowRoot.

The argument for using `connectedCallback()` to create the shadowRoot and filling it with content is that we want to do this heavy work as late as possible. This is only partially true. With elements in the main document, preventing FOUC is more important than delaying construction. Furthermore, if you need to delay the construction work of web components, you should delay the entire process (ie. making the element, not just delaying attaching it to the DOM). And finally, sometimes you actually want to do heavy work up front, while you have idle time, and then use that work when activity blossoms and resources become scarce.

In sum, 
1. you want the elements constructed by other priorities during main document loading. 
2. If you want to delay work, to delay constructing the shadowDom is a sub-par solution compared to delaying the construction of the entire element. 
3. when you construct elements up front to cache resources for later use, constructing the entire element with shadowRoot and all is vastly preferable to only calling the constructor or having to add the element off screen in order to get shadowRoot initiated.

## WhenTo: construct shadowRoot during constructor?

If your web component has a fixed shadowRoot (ie. do not add/remove or change the position of its shadowRoot elements based on either `attributes` or `childNodes`), then you should create the shadowRoot during the `constructor()`. This type of shadowRoot `constructor()` is the goal, and so if you can, make the shadowRoot in the regular `constructor()`.

## WhenTo: construct shadowRoot during `ready()`?

If HTML elements or CSS rules in your web component varies with the presence or value of attributes, create your web component in `ready()`. The goal of CSS and CSS variables and CSS shadow parts etc is to make such shadowRoot structures unnecessary. However, this might be too difficult, not yet available in all browsers, or otherwise hindered, so that the most efficient overall solution is to change the HTML structure of the DOM using JS event listeners in `attributeChangedCallback()`. If you try to implement `<details open>` using web components today for example, creating the shadowDOM during `ready()` is best.

You don't need ready for event listeners. What you need for event listeners is an off attribute. And if you manage to construct the shadowRoot that only use css to react to host node attributes, then you don't need ready for shadowRoot. Maybe there is no real use-case for ready.

No. There is still a big use-case for ready. What if the component needs to observe *other* aspects of its context, such as browser type or 'offline/online' at the beginning? And show these properties as attributes? Then, it cannot write attributes during predictive parser, not from a prt either, and that means that it must have a ready-callback.. Or does it. I need 

## WhenTo: construct shadowRoot during the first `childChangedCallback()`?

todo The new Imperative Slotting API.

Some web components <slot> around its childNodes and might cause FOUC if you have different childNode configuration. Again, think `<details>` and the edge cases with missing `<summary>` elements. Here, you might need to make dynamic changes to the shadowRoot elements that vary with the presence of certain child nodes. And when that happens, you wish to delay the construction of the shadowRoot until you know that the children are listed.

If you create the shadowDom at first `ChildChangedCallback()`, then we need to hide the rendering of the children until the first `childChangedCallback()` is made. We do that by creating a `this.attachShadow({mode: "open"});` in the constructor, but not adding a `<slot>` element. If not, during the predictive parser, we might can get a flash of unstyled content as the children are being interpreted.  