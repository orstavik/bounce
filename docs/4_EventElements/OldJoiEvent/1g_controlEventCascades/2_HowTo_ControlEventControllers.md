# HowTo: Control EventControllers

When an event controller receives an event, it can react in 4 ways:
 1. trigger a (default) action on an element, document or window in the DOM,
 2. queue a new event into the event loop,
 3. store some data about the ongoing event sequence, and/or 
 4. change its own state (life cycle).

But, to make a decision about what to do, native event controllers rely on ***two** sources of information*:
1. **the event sequence** (ie. data stored about previous events).
2. **the DOM**.
 * There are *no* JS methods or properties that control native event controllers, outside of the DOM. 

## Event Sequences

When an event controller receives a trigger event, the event controller can cache data from that event to use in its future evaluations of other trigger events. For example:
 * a KeypressController stores data about which keys was pressed when,
 * a DragController stores data about the initial `mousedown` trigger event,
 * todo more

When you store an event, much of the information of that event remains constant/immutable. Unless some event listener has broken the event to pieces with `Object.define(..)`, the event's `type`, `target`, and properties like `clientX` remains constant during an event cascade.

But, there is one piece of the event's state that should be considered lost if you don't store it specifically: the event's `path`/`.composedPath()`. Both during event propagation of one event, and during the cascade of several events, event listeners often change the DOM. This might cause the `target` to move and hence the composed path to be mutated.

Event controller's often need the `.composedPath()`: when event controllers that rely on event sequence state identify the target of an ensuing action or event, they often do so by finding the *lowest common target* for two trigger events. For example, a `click` is targeted at the *lowest common target* of the preceding `mousedown` and `mouseup` events for the primary mouse button.

> Thus. Remember to cache the composed path when you cache events.

Native event controllers only react to events dispatched by the browser itself, *not to events generated by scripts*. This means that we cannot "program" event controllers by dispatching script-generated, "mock" events. Furthermore, native event controllers *cannot* be controlled directly from JS. All JS methods and properties that control event controllers do so by setting a property on a node in the DOM. Therefore, we have only one other way to control/"program" the browsers native event controllers: the DOM.

## Control event controllers via the DOM

HTML, CSS, and JS has a total of four mechanisms for controlling the DOM.

1. Interactive elements.  
2. Event controlling HTML attributes.
3. Event controlling CSS properties.
4. passive or active JS event listeners (applies only to scrolling via `touch...` and `wheel`).

Using these four mechanisms developers can add settings that regulate native events. But how exactly does the native event controllers use these settings? In what order does it search the DOM for them? And what does the browser do if a conflict arise, ie. if it finds multiple, contradictory, mutually exclusive settings?

## Basic DOM grammar and events

The DOM is an acyclic graph. Nodes nested one inside each other form an inverted tree from a single outermost container parent node to many inner child nodes. Thus, if we look at any node in the DOM, we have a potential for a **tree of descendants below** and a **linear chain of ancestors above**.

This structure is built into many aspects of HTML, CSS, and JS:

1. HTML content structure. Put text inside a `<h1>`, and that text will be the content of the header element. This structures positions the content both conceptually and visually. Thus, to interpret a node's "role" in a document, we would go up the ancestor chain: the text is a header. The header is part of `<main>` that represent the main text block on the page. Etc. etc. This conceptual structure of the content of the document is also reflected in the layout of the text.

2. CSS properties cascade. They trickle down and spread throughout the branches of the DOM from parents to children. Reversely, to find the origin of a CSS property of a node, we can simply follow the chain of parents up until we find *the nearest node** that defines that property.

Principally, event *should* follow the same, principal rules of the DOM that regulate HTML and CSS:
  
1. Events are `target`ed at either an element, a `document`, or the `window`. And, when an event finds its target, for example when a `submit` is triggered as a consequence of a `click`, it looks only for `<form>` elements directly above the 'click' target in the DOM, never any siblings.
2. Event propagates in the the linear parent chain. Events trickle down the DOM during the capture phase, hits its target element, and then bubble up again. Event listeners nearest the target are run first in the "normal bubble phase", vice versa in the capture phase.

Both event targeting and event propagation suggest adherence to the rules of *direct ancestors only* and *nearest node first*.

## 'to accumulate or to overwrite?', that is an awful question
 
To understand event control via the DOM, we first need to understand the concept of property accumulation. And to do so, we turn to variables in JS. 

```javascript
//normal JS (overwrite)
var a = 1; 
a = 2;
a === 2;  /*true*/
```

In the above example, we have normal JS. We can think of variables as a property in JS, and we can assign these variables new values. And, when we do, we *overwrite* them, obviously. This is normal. You expect this behavior. Now lets take an accumulative, abnormal approach to JS variables.

```javascript
//abnormal JS (accumulative)
var a = 1; 
a = 2;
a === [1, 2];  /*true*/
```

The interpretation of the JS code above doesn't exist of course. It is a made up example. But, it illustrates how the variable-properties in JS would behave if viewed as sequentially accumulative, and not as sequentially overwriting the same value.

And, here is the point:
> When event controllers *interpret* HTML elements in the DOM, they view their properties both as:
>  * overwriting each other in the DOM (interactive behavior will "inherit' down to `click` target), 
>  * accumulative (`touch-action` values accumulate behavior restrictions), and
>  * constant (first `<base href>`'s value will neither accumulate nor be overwritten).
 
What this means is that the each event controller and each mechanism *defines* if their mechanism for control from the DOM overwrites or accumulate properties. Semantically. Put simply, you "just have to know" how the control mechanism works, because they all work in their own peculiar way. It is a mess. And from viewing the browsers and the spec, there is no clear strategy to fix this problem.

If you are with me so far, great! I expect to have lost you. And what I also expect is that you do not understand what accumulative interpretation of properties is. 

## Conclusion

In the coming chapters we will look at different means for event control via the DOM. We will illustrate both how the control mechanism works, provide examples of when the browser utilize a

1. Properties inherit *only* from parent to child. Properties do no inherit from siblings or other nodes in the DOM that has no directly upward relationship to the element
   * We will see how this concept is broken in the `<base href>` to `<a href>` pattern, but no rule without an old guy objecting to it, right?
2. Properties inherit from nearest parent. If the same CSS property is defined on both an elements grand-parent and grand-grand-parent, then the property defined on the grand-parent should overwrite that of the grand-grand-parent. In the context of CSS, the DOM is viewed as sequential, read from top to bottom (left to right). And this rule echo the concept of variable assignment in imperative programming: ``.
   * This rule also has several exceptions in the domain of event control. In fact, from excisting implementation, it might not appear to be part of HTML at all. However, I will argue that this rule is so strongly established through a) CSS property inheritance and cascation, b) event propagation, and c) target allocation, that even though one might define the HTML attributes as cummulative and not overwriting each other as one traverses the parent chain down to an element, that is *not* how even experienced web developers would view them.
   
To find an inheritable property of an element, follow the parent chain upwards from the element until its nearest specification. The linear parent chain is sequential in defining proerties. The property nearest to an element wins over a property above the element. 

When DOM event controllers approach the DOM, they either approach the DOM as:
 * the full, universal DOM for events directed at any target in it, and/or
 * 

Most often, we view the DOM as a whole. We can use `querySelector(..)` to traverse the DOM or a branch of the If we look at the DOM as a whole, using querySelector we think about it from a topIf you look at the DOM three, we search top-to-bottom, left-to-right. 




Event controllers search the DOM for contextual information in two types of selections:
 - the propagation path/target ancestor chain of the events' `target` element, and/or
 - the full DOM.

The "normal" 

In the next chapters we will look at these techniques. But we need a model to discuss these mechanisms against.

## How does the event controller search the DOM for data?


## References

 * 


1. apply its drag'n'drop functionality to certain elements with the `draggable="true"` HTML attribute,
2. control the sequence with which the user can `Tab` through the document using another HTML attribute`tabindex`,
3. not perform scrolling or zooming on if the user touches other elements using `touch-actions` or `pointer-events`, and
4. tell the browser to disregard any calls to `.preventDefault()` in `wheel` and `touchstart`/`touchmove` and thereby make ensuing scroll action inevitable.

In short, there is:
 * different HTML elements have different roles, (which elements react to events exactly?) 
 * a small set of HTML attributes, (which and how many exactly) 
 * a small set of CSS properties, (which and how many exactly)
 * 1 event listener option,
  
whose sole purpose is to control the browsers event controllers.

> You might have thought that the most natural medium to do so would be global JS functions/settings. Not so. In fact, there is only *one* event control we implement via JS: passive/active event listeners, and this mechanism is actually more tightly associated with the DOM than JS. 

## Principles of event controls



To control an event controller, you add a setting to the DOM that the event controller reads. This setting is:
1. choice of HTML element type, 
2. an HTML attribute, 
3. a CSS property, or
4. an event listener option.

Usually the event controller only reads dom elements in the event propagation path, but sometimes it also reads data from elements in the dom. Examples of such other elements are base href element and tabindex attribute.


1.What is the criteria for selection of target? If the event cannot find a target, then it can't exist. A) Events that have no particular home in the DOM, are directed at the window.
B) some events, such as click, accepts all targets. Their "queryselector" = "*".
C) other have element type: "summary"
D) attributes, "[draggable='true']"
E) element type and/or attributes "a[href]??? or"img, a[href], [draggable='true']".
F) computedStyle.touchAction!= "none".




Neither the spec nor the browsers clearly define *a fundamental design* for event controllers. If we are to be blunt, both the spec and the browsers are a bit all over the place in this regard. So, for us to describe this design, we need to make some assumptions for ourselves.

The functions that make and dispatch the browsers native events (the native event controllers) operate in a *three* dimensional context:
1. The DOM context. When the browser receives a trigger event such as a `mousedown` or a `wheel`, it will look at the position of that event in the DOM when it makes its interpretation about what that event should mean (ie. which a) actions and b) other events it should trigger).
2. The event sequence (prior and subsequent events). The browser interprets many events as part of a sequence: a `mousedown` and a `mouseup` combine to form a `click`; a `wheel` event that immediately follows another `wheel` event is a scroll continuation.
3. Other event controllers. When the DragController identifies a series of `mousedown` and `mousemove` as a `dragstart`, it prevents both other mouse events such as `mousemove`, `click`, and `dblclick` from being dispatched to the DOM.  

### DOM structure and event control

We start with the first contextual dimension: the DOM. Many CSS properties in the DOM cascade. They trickle down from parent to child nodes, and you can both override and stop (`unset`) this cascade along the way. Similarly, the content (HTML elements) are structured in this way: put text inside a `<h1>`, and that text will be the content of the header element.
 
Event propagation in the DOM works in a related manner. Events trickle down the DOM during the capture phase, hits its target element, and then bubble up again. The structure of the DOM is reflected in the event propagation path.

This DOM structure is used to evaluate the interpretation of the events. If the propagation path does not contain any elements with the `draggable="true"`, then the browsers should not drag neither. But, what if the event propagation path contained *both* an element with `draggable="true"` *and* an element with `draggable="false"`. Does `draggable="false"` always trump `draggable="true"`, or vice versa? Or should the browser look to the attribute **nearest the target**? Put simply, does the HTML `draggable` attribute cascade?

##

The DOM, or the CSSOM, and its properties in this   
the hit target for that element (ie. the position  
provide us with:
1. a mechanism to make our own events and event controllers, nor
2.  that describe how we should think about controlling existing events and event controllers.
 
 should be  really do have a clearly defined set of guidelines for how event controllers should run and how they should be controlled. 

Essentially, via specific HTML attributes and CSS properties designed for the particular this purpose and this purpose only,  
1. not apply any scrolling or other `touch-actions`
1. tell it not to apply any scrolling or other `touch-actions`
1. we can tell the browser to 

3. CSS properties to turn on/off default actions

4. passive event listeners