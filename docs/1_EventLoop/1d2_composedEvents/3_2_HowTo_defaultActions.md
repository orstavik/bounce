# HowTo: defaultActions

There are two ways that a property can be set in a web component: js and defaultActions (html+event composition). If you change a property from JS, it is assumed that this JS runs from the document context of the lightDOM, user document context, of that element, and thus you commonly can think that it is 'smør på flesk' to also notify the lightDOM about this state change via an event: It doesn't need feedback on the consequence of its own action.

However, when the property is set via a defaultAction, the state change needs an event. DefaultAction event listeners is the natural place in a web component to dispatch events from. It is the defaultAction function that should alert state change.


```javascript
function defaultActionEventListener(e) {

  if (e.defaultPrevented)
    return
  if (!this.hasAttribute("additive"))
    e.preventDefault()
  if (this.getAttribute('additive') === "once")
    this.removeAttribute("additive")
  //If the state change only affect the host node (or maaaaybe a parent node in the lightDOM), then it is a localStateChange that should get a composed:false event.
  //if the state change is global (like the aHref link navigation or submit), then the notifying event should be composed: true (global).
  const composed = localStateChangeScope ? false: true;
  const beforeEvent = new Event("before-statechange", {composed}); 
  this.dispatchEvent(beforeEvent);
  if (beforeEvent.defaultPrevented) //state change aborted
    return
  doLocalOrGlobalStateChange();
  const afterEvent = new Event("after-statechange", {composed});
  this.dispatchEvent(afterevent);
}
```

# Why: bounce events?

bounce can be used to implement default actions, solve problems regarding stopPropagation, turn the abnomaly of focus events into a naturally occuring phenomenon, etc.

## `composed: true` vs. `composed: bounce`

`composed: bounce` is *very* similar to `composed: true`. For example:

1. When the `bounce-change` event propagates in an upper DOM context, it will be re-`target`ed to the host node that exists in that context. This is exactly the same re-`target`ing that happens when a `composed: true` event propagates in a DOM context above. This also causes the `eventPhase` to register as `2`(target phase) when the event listeners are intercepted on the host node, when in reality this event listener runs in the capture or bubble phase.

But, there are a few subtle differences that make sense.

1. `stopPropagation()` from event listeners in the capture phase in upper DOM contexts can no longer "torpedo" and silence an event *before* an event listener inside the web component has had a chance to listen for it. This is a double-edged sword:
	* On one side, it means that within the web component, you can be certain that you will be notified of any events when you listen for it, but
	* On the other side, this robs the outer context of its ability to use `stopPropagation()` calls in `capture` phase event listeners above an inner web component to stop the web component from doing something.

2. Often, an inside change might not be an outside change. Let's take an example:
	1. You have *two* `<input>` elements inside the shadowDOM of a web component.
	2. You switch focus from one of these `<input>` elements to the other.
	3. In the context of the shadowDOM, this is a focus shift, and it should trigger a.o. a `focusin` and a `focusout` event.
	4. But, in the context of the host node, this is not a focus shift. Within this context, the focus is still within the host node.
	5. Custom implementations of `composed: bounce` events could prevent the event from being bounced when the state remains the same from the point of view of the host node's lightDOM.

## Why bounce?

The native focus events bounce. Or kinda bounce. So to understand the focus events, it is useful to understand the hypothetical concept of event bouncing.

But. The two propagation orders of `composed: true` and `composed: bubble` overlap. They fulfill many of the same use-cases. So. Which is better? And, can we replace one with the other?

1. If we look at the propagation order of target and bubble phase event listeners, then their propagation order remain the same both in sequence `composed: true` and `composed: bubble`. As the majority of event listeners are added in the bubble phase, there would be little difference for a majority of use cases. This means that for target and bubble event listeners only `.stopPropagation()` would work the same way for `composed: true` and `composed: bubble`. Ergo: Ergo: if we disregard capture phase event listeners, then `composed: true` could be replaced by `composed: bubble`.

2. The `composed: true` vs `composed: false` dichotomy doesn't support having an event both a) cross shadowDOM borders *and* b) be dispatched from a root node that is *not* the top `window` node. This means that there are several use cases, such as those present for focus events, that require some kind of hack solution in order to have the same event propagate across shadowDOM borders but also be stopped at a shadowRoot higher up in the DOM.

3. If we look at the propagation order of capture phase event listeners, then there is a clear difference. `composed: true` enable a higher DOM context event listeners to capture an event *before* an event listener in a lower DOM context. This cannot be replicated in `composed: bubble`, and so for example EarlyBird event listeners would be impossible. Thus, `composed: bubble` would require:
	1. the existence of `addDefaultAction()` or some other kind of post-propagation callback to control which default action is set up, and
	2. some type of pre-propagation callback (particularly for UIEvents) that would enable web developers to:
		* grab certain event types, as the native drag'n'drop events do mouse events, and/or
		* block/stop the propagation of certain events to lower DOM contexts when needed.

4. The property `capture: bubble` is only hypothetical. But, if all `composed: true` events were made to bounce instead, then all events could be set as `composed: false`. Thus, if all functions that today dispatch `composed: true` events were to instead dispatch bouncing events, then all events could be set to `composed: false` and presto: there would be no need for the `composed` property on events at all and it could simply be removed.

5. Which conceptual model is more or less orderly/understandable?

* If you look at all the nodes in a flattened DOM, then the `composed: true` with its straight line down and straight line up looks nice. But, if you look at the flattened DOM as a group of nested DOM contexts, then `composed: bubble` is simpler as it would present the overall propagation as a single line between DOM contexts, from inner to outer. When web components are slotted or nested inside each other, the `composed: bubble` has clear conceptual advantages over `composed: true` as developers can at best be expected to envisage the flattened DOM context and not all the flattened DOM nodes.
* When you develop a reusable web component, you do *not* know what the surrounding DOM looks like. From the perspective of a reusable web component, the propagation path thus has other, external event listeners running **before and after** if `composed: true`, while in `composed: bubble` the propagation path of " access to the above DOM propagation path. Hence, from the perspective of the web component, then the `capture: bubble` is simpler.
* When you make a web component or main document using web components, you are *not* expected to understand the inside of the web component. It could therefore be very confusing if an event propagated into a web component, but not out of it. So, also from the developer of an upper level DOM context, it is simpler to know that the inner propagation has completed before any of your own event listeners run (both capture phase and bubble phase).

## The real problem: version/naming conflicts

Imagine you have two different components in two different branches in the DOM. You load them other developers registry. Both require a touch-drag event to be used in their shadowDOM, and so both implement a touch-drag event controller. Maybe even the same event controller.

These event controllers are implemented as a composed: true events. they listen for the touch event on the window in the capture phase, and when they spot a pattern, they generate a new set of events. Suddenly, they both spot the same pattern, and they both dispatch an event with the same name, or they dispatch two different, overlapping events. This can cause both bugs and is likely destroying performance and efficiency.

As the local element need to operate in a global scope (a local DOM context needs to operate in a global/composed event scope), then two local scopes that do not know about each other might get into conflict. If event controllers only operated within a single DOM context, ie. produced local, non-composed events, and not produced global/composed events, then there would be no conflicts. This is why you would *really, really* want only composed: false events and thus event bouncing.

> Sometimes, you would need to be able to communicate to an upper DOM context that the triggering event is renamed (from mousemove to drag) or stopped. This should be done using a `stopBouncing()` method or `rename()`/`mutate(EventDictionary)` method. This cannot be done for `composed: true` events, and so for these events a special `first` event listener must be added to the `window` in the capture phase to ensure that other event controllers can block the triggering event. Alternatively, a

## Discussion: bouncing events that are not slotted

Problem_CapturedTorpedo, that is `composed: true` events that are caught at a lightDOM higher up and stop.propagated before it reaches the element in which the `target` resides.

this gives us a reason to make the event propagate partially? no.. This is a reason to have events be composed: false;...

Problem_PartialPropagation, we need a three level shadowDOM where the event is relevant two layers, but not three. this is the use case behind focus.

Problem chapter, sometimes internal state changes represents external state changes, sometimes not. The focus event is an excellent example of this.

Todo should I split up this chapter to describe a capture phase torpedo for composed events? Then we would have two problem chapters, and one solution chapter for the bounce event. And then we could have as solution, to use bounce instead of composed true in the event controller function, plus add the restriction of never responding to slotted events.

Would it have been better to bounce all `composed: true` events? Would it be better, more understandable sequencing, if `click` for example was bounced?

That would make it much simpler to make defaultActions at least..

It cannot be polyfilled, because the `isTrusted` property cannot be cloned in the bounce clone event.

It will be very inefficient for `mousemove` events etc.

But `composed: true` likely should have been designed in this way from the outset..

## References

*

## draft on the reason for bounce sequence.

1. the uppermost document is the "end-user-developer".
2. the innermost target is closest to the (user) action.

(1) The uppermost `Document` is the main document. This is the document of the app. Inner(lower) `Document`s are web components. These are developed by other developers to be used by outer `Document` contexts. Therefore, event listener functions in the outer `Document` contexts should run *first*, so that they can programmatically control/block lower actions. The outer `Document` uses one finite set of inner elements (and thus one finite set of other `Document`s); an inner element can be used in hundreds or thousands of other outer contexts, and therefore cannot be expected to adjust its behavior to the quirks of all of them. Outer `Document` should control inner `Document`, and by having the other `Document` event listeners run before the inner `Document` event listeners, this is achieved.

The purpose of `.preventDefault()` is exactly this. `.preventDefault()` is a function that can be called to control a function associated with the internals of native elements that will be triggered *after* event propagation. Put simply, *when event propagation bounce, default actions can be implemented as more or less regular event listeners in any web component!*

This means that event listeners in the upper `Document`s should be processed *before* the lower "HostNodeShadowDom" `Document`s.

(2) If a `<h1>` is put inside a `<div>` which is put inside an `<a>`, and the user clicks on the `<h1>`, then the `<div>` is closer to the user action than the `<a>`. Thus, if `<div>` and `<a>` has one competing (default) action, then by default the action *chosen* by the user would be the action of the element *closest* to the original target.

In the case of SlotMatroskas, the outer SlotMatroska should run *before* the inner SlotMatroska.

This means that you get the following recursive structure:

1. you start with the full path from the inner most target to the top, and you reverse it.
2. Then you find all the targets to the outermost `Document`.
3. This is your first list of elements, you run the event listeners on these elements capture, then bubble.
4. Then you look bottom up at the elements inside the `Document`. If there is a ShadowDOM associated with that element in the path, you step into that document. You repeat the steps from 2 in this `Document`.
5. When there are no more elements to look for shadowDOMs in, then you go back to the top.
