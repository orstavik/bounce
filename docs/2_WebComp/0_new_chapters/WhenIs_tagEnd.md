# WhenIs: tag end?

The main problem for the `Element.constructor()` is *not* that we *sometimes* have a callback at tag start; the problem with `Element.constructor()` is that we *don't have a callback at tag end.

What we want is as follows:
1. When the predictive parser is making a "tag start" `Element.constructor()` call, we want this call to be sent to a `Element.preConstructor()`. The `preConstructor()` more or less echoes the `Element.constructor()` but it also does *two* things:
   1. it will throw an `Error` if you try to *read* `attributes` or `childNodes` from the element, and
   2. it adds a callback argument `tagEnd` that is `true` when the `postConstructor()` callback will be called immediately afterwards.

2. Do we want a `attributeReadyCallback()` as soon as the attributes are ready? Many `shadowDom`s only want to change depending on their attributes. The problem with `attributeReadyCallback()` is that it might be delayed.

3. As soon as the end tag has been read *and* the element has been connected to the DOM (directly or indirectly), then we wish to get another callback `postConstructor()`. When the `postConstructor()` is called, the element can be assured that *all attributes* and *all childNodes* defined in template has been read and written. The `postConstructor()` is called at roughly the same time as an upgrade would, ie. when the element is either first connected to the DOM for the first time or plugged-in. The only difference is that if the element is being created by the predictive parser or the upgraded from within an element itself, the `postConstructor()` will only run as soon as it knows that `DOMContentLoaded` or the predictive parser is parsing a non-descendant element in the same(main) `document` (which would mean that the predictive parser has processed all the `childNodes` of the element).
The `postConstructor()` can safely both *read and write `attributes` and `childNodes`* to the host node if it needs/wishes.
4. There are *no* `attributeChangedCallback(..)`s made *before* the `postConstructor()`. Any `attributeChangedCallback(..)` that the browser makes between the `preConstructor()` and `postConstructor()` will simply be put on hold and run *after* the `postConstructor()` is called.
 
Splitting the `constructor()` in two like this serves the following purposes:

1. The `preConstructor()` essentially echo the current `Element.constructor()`. Most importantly, the `preConstructor()` still has the same restriction as `Element.constructor()`: NO `this.setAttribute(..)` nor `this.append(...)`; NO writing to the host node.

   But, the `preConstructor(tagEnd)` has now been given a `tagEnd===true` argument. `tagEnd` tells the web component developer two things:
      1. `attributes` and `childNodes` *can* be *safely* read. There are no attributes nor childNodes defined in HTML template that are not yet visible as JS properties. This means that if the developer needs to, he can for example build a `shadowRoot` based on `attribute` or `childNodes` values. This can be more efficient than first making a default `shadowDom`only to change it (several) times immediately afterwards, and it can help the developer avoid needlessly having a web components `shadowRoot` needlessly flash a default view before updating to fit its content. 
      2. `tagEnd === true` also implies that the `postConstructor()` will be called immediately and synchronously afterwards. This might be of value too.   

2. The `postConstructor()` will *only* be called when the will be called even  making a consistent the state available The `preConstructor()` serves is is useful for two purposes, namely   


## References