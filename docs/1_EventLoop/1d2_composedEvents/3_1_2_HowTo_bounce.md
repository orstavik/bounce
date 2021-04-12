# HowTo: bounce?

## Bounced `eventPhase` sequence

Within each document, event listeners are then grouped according to `eventPhase`:
1. `Event.CAPTURING_PHASE` (down path (path in reverse), excluding target node),
2. `Event.AT_TARGET` (target node for the given `Document`), then
3. `Event.BUBBLING_PHASE` (up path, excluding target node).

This mirrors exactly the sequence of event listeners when there is no shadowDOMs.

## Bounced listener sequence

Within each event target per phase, event listeners are sorted FIFO per eventPhase. This mirrors exactly the existing sequence of event listeners when there is no shadowDOM.



> remaining problems: 
> 1. `onclick` and other old-time primitive methods. todo, these are simply ignored via stopImmediatePropagationOG, unless they are added in advance of the `addEventListener()`s entries.
> 2. `handle()` objects. simply throw an `Error`?

In order to implement a bounce propagation sequence, we essentially need to monkey-patch the entire event propagation system in the browser. Yes. You heard correctly, **monkey-patch the entire event propagation system in the browser**. Not only are we going to do so in this article series, but I am going to argue that:
1. It is necessary. Because the event propagation system in the browser is self-contradictory and in need of repair. I am going to argue that a) if we fix the event propagation system, then we fix problems in existing web architecture, and b) that we cannot create reusable web components *before* we actually do that.
2. Monkey-patching the entire event propagation system can be done a) safely, b) efficiently, and c) with minimal intrusion to existing code bases. I am going to argue that the monkey-patch be considered more along the lines of a spec patch/polyfill that chooses *one* of the self-contradictory practices currently embedded in DOM event propagation, rather than making a new opinionated variant.

## HowTo: monkey-patch the JS event propagation sequence?

To change the event propagation sequence, we need to change the order in which *every* event listener is executed. The best way to do that is   

Todo, when i override `stopPropation()`, i can call the original `stopPropagation()` function so that the other event listeners are dropped. We don't need them anymore. And then we must override the `stopPropagation()` method for the event.



1. override `addEventListener`.
    1. make a full register of all event listeners added in the DOM.
	2. instead of adding the normal event listener functions, add a `eventTick(e)` function that will run an alternative event loop for you.
	3. inside the `eventTick(e)` function, you will iterate sync over the entire `bouncedPath` for the event, so that all the event listeners are called in document order, instead of flatDom order. This happens sync, so that any async event dispatches will be ignored.

* rule #1: event objects cannot be reused. Override dispatchEvent() to clone all events that has propagated before.
* rule #2: all events propagate sync. No more async propagation for UI events. Which is good, because you can never tell if an event is async or sync.
* rule #3: all adding of event listeners are dynamic. No more special rule that event listeners on the same target(phase) can be removed, but not added.
* rule #4: all at_target event listeners now run capture before bubble. No more special rule that innermost target shuffle all capture and bubble event listeners in one common insertion order.


* tip 1:   all event listeners are removed when the event stack is empty.


## References

*
