// const eventToState = new WeakMap();
//
// export function initEvent(e, el) {
//   eventToState.set(e, el);
// }
//
// Object.defineProperty(Event, 'FINISHED', {value: 4, writable: false, enumerable: true, configurable: false});
// Object.defineProperties(Event.prototype, {
//   timeStamp: {
//     get: function () {
//       return eventToState.get(this)?.getAttribute(':started') || -1;
//     }
//   },
//   composedPath: {
//     value: function () {
//       return eventToState.get(this)?.composedPath.slice() || [];
//     }
//   },
//   path: {
//     get: function () {
//       return eventToState.get(this)?.context.path.slice() || [];
//     }
//   },                      //todo unsure of the configurable and writable here
//   target: {
//     get: function () {
//       return eventToState.get(this)?.context.path[0] || null;
//     }
//   },
//   currentTarget: {
//     get: function () {
//       return eventToState.get(this)?.currentTarget || null;
//     }
//   },
//   eventPhase: {
//     get: function () {
//       const eventElement = eventToState.get(this);
//       if(!eventElement)
//         return Event.NONE;
//       if(eventElement.hasAttribute(':finished'))
//         return Event.FINISHED;
//       if(this.currentTarget === this.target)
//         return Event.AT_TARGET;
//       return Event.BUBBLING_PHASE;
//     }
//   },
//   stopPropagation: {
//     value: function () {
//       throw new Error('omg')
//     }
//   },
//   stopImmediatePropagation: {
//     value: function () {
//       throw new Error('omg')
//     }
//   },
//   defaultPrevented: {
//     get: function () {
//       return eventToState.get(this)?.hasAttribute(':default-prevented');
//     }
//   },
//   preventDefault: {
//     value: function () {
//       eventToState.get(this)?.setAttribute(':default-prevented');
//     }
//   }
// });