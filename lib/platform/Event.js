import {getNativeDefaultAction} from "./getNativeDefaultAction.js";

Object.defineProperty(Event, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});
Object.defineProperty(Event.prototype, "FINISHED", {value: 4, writable: false, configurable: false, enumerable: true});

export const stopImmediatePropagationOG = Event.prototype.stopImmediatePropagation;
export const preventDefaultOG = Event.prototype.preventDefault;

//WhatIs: stopPropagation and preventDefault *before* event dispatch?
//a. To call .preventDefault() *before* dispatch essentially strips any default action from the event before it beings. Valid.
//b. To call .stopPropagation() *before* dispatch means that the event will only propagate one context, one phase, one target.
//c. To call .stopImmediatePropagation() *before* dispatch means that the event will not propagate, if some other part of the system tries to dispatch it.
//   todo problems here.
//   todo add special properties for the stoppedBeforePropagation, and preventedBeforePropagation?

// rule #4: 'stopPropagation' and 'stopImmediatePropagation' works only per propagationContext/document.
// rule #5: eventPhase === 0 Event.NONE means not yet begun, eventPhase === 4 Event.FINISHED === 4

//rule #x: adding phase 4 for event finished propagating.

// Object.defineProperties(Event.prototype, {
//this adds properties to the Event so that we can get the correct state information from it.
//   'eventPhase': {
//     get: function () {
//       return this.ititit?.phase || 0;
//     }
//   },
//   'currentTarget': {
//     get: function () {
//       return this.ititit?.currentTarget || null;
//     }
//   },
//   'path': {
//     get: function () {
//       return this.ititit?.path || [];
//     }
//   },
//   'target': {
//     get: function () {
//       return this.ititit?.target || null;
//     }
//   },
//   'currentRoot': {
//     get: function () {
//       return this.ititit?.currentRoot || null;
//     }
//   },
//   'bouncedPath': {
//     value: function () { //returns a copy of the bouncedPath (preserving the original bouncedPath immutable).
//       return this.ititit?.contexts.map(({parent, root, path}) => ({parent, root, path: path.slice()})) || [];
//     }
//   },
  //bubbles, composed: NO need to override, always static
  //composedPath is setup in EventTarget.dispatchEvent
  // 'stopPropagation': {
  //   value: function () {
  //     this.eventPhase > 0 ? this.ititit.stop() : this.stoppedBeforePropagation = true;
  //   }
  // },
  // 'preventDefault': {
  //   value: function () {
  //     this.eventPhase === 0 ? this.preventedBeforePropagation = true : this.ititit.prevent();
  //   }
  // },
  // 'defaultPrevented': {
  //   get: function () {
  //     return this.eventPhase === 0 ? this.preventedBeforePropagation : this.ititit.isPrevented();
  //   }
  // },
  // 'preventDefaultOnHost': {
  //   value: function (element) {
  //     if (this.eventPhase === 0)
  //       throw new Error('preventDefaultOnHost before dispatch is not implemented. It would only be possible on the root, which would also be somewhat meaningless.');
  //     if (!(element instanceof Element))
  //       throw new Error('IllegalArgument: preventDefaultInside(element) can only be called on Element objects.');
  //     const shadowIndex = this.ititit.contexts.findIndex(({root}) => root === element.shadowRoot);
  //     if (shadowIndex === -1)
  //       throw new Error('IllegalArgument: The given Element is not in the composed path of this event.');
  //     this.ititit.prevent(shadowIndex);
  //   }
  // },
  //the innerMost, nearest target, lowestWins default action
//native default actions run only from the following contexts!
//1. the innerMost target context. The shadowRoot of for example a <button> or <input> element
//   This means that all the ancestor host contexts can be skipped.
//2. the native slotted contexts.
//   This means that all custom element slotted contexts can be skipped.
//3. Native elements only have PREVENTABLE or PREVENTABLE_SOFT default actions for a select match of elements.
//   this means that many native propagation contexts can be skipped when event + host element doesn't match up.
//4. Finally, when all the above match, you have found the native default action that should be invoked.
//   If this context is prevented, then call the native preventDefault(). If not, just return
//   (and choose NOT to call the native default action)
//?? Find the native default action element using the composedPath??
  //todo replaced.
  // 'getNativeDefaultAction': {
  //   value: function (event) {
  //     if (this.eventPhase === 0 || this.eventPhase === 4)
  //       return {};
  //     const contexts = event.ititit.contexts;
  //     for (let i = 0; i < contexts.length; i++) {
  //       //1. skip nested host contexts and jump straight to last host context (innerMost) (and slot contexts)
  //       if (i < contexts.length - 1 && !contexts[i + 1].slot) continue;
  //       const target = contexts[i].root.host;
  //       //2. skip non-native contexts
  //       if (target.tagName.indexOf('-') > 0) continue;
  //       const nativeDefaultAction = getNativeDefaultAction(target, event);
  //       //3. skip native contexts that don't have a default action for this type of event
  //       if (!nativeDefaultAction) continue;
  //       //4. found the native default action, return it and its prevented status
  //       return {target, nativeDefaultAction, prevented: this.ititit.isPrevented(i)};
  //     }
  //     return {};
  //   }
  // }
// });

//
// const EventConstructorOG = window.Event;
// window.Event = function Event(...args) {
//   if (!new.target)
//     throw new TypeError("Failed to construct 'Event': Please use the 'new' operator, this DOM object constructor cannot be called as a function.");
//   const event = Reflect.construct(EventConstructorOG, args, EventConstructorOG);
//   const dict = args[1];
//   if (dict instanceof Object && dict.composed instanceof DocumentFragment || dict.composed === window)
//     event.root = dict.composed;
//   return event;
// };