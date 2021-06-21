export const composedPathOG = Event.prototype.composedPath;
export const preventDefaultOG = Event.prototype.preventDefault;
export const stopImmediatePropagationOG = Event.prototype.stopImmediatePropagation;

const eventToState = new WeakMap();

export function initEvent(e, composedPath) {
  eventToState.set(e, {
    timeStamp: new Date().getTime(),
    eventPhase: Event.BUBBLING_PHASE,
    composedPath
  });
}

export function updateEvent(e, key, value) {
  (eventToState.get(e))[key] = value;
}

// function updateDefault(e, value, element) {
//   if (e.eventPhase === Event.NONE)
//     throw new Error("you can't call preventDefault() before event propgation.");
//   if (!element)
//     return eventToState.get(e).context.prevented = value;
//   const childIndex = e.path.indexOf(element);
//   if(childIndex === -1)
//     throw new Error('the element is not part of the path.');
//   eventToState.get(e).context.contextChildren[childIndex].prevented = value;
// }
Object.defineProperty(Event, 'FINISHED', {value: 4, writable: false, enumerable: true, configurable: false});
Object.defineProperties(Event.prototype, {
  timeStamp: {
    get: function () {
      return eventToState.get(this)?.timeStamp || -1;
    }
  },
  composedPath: {
    value: function () {
      return eventToState.get(this)?.composedPath.slice() || [];
    }
  },
  path: {
    get: function () {
      return eventToState.get(this)?.context.path.slice() || [];
    }
  },                      //todo unsure of the configurable and writable here
  target: {
    get: function () {
      return eventToState.get(this)?.context.path[0] || null;
    }
  },
  currentTarget: {
    get: function () {
      return eventToState.get(this)?.currentTarget || null;
    }
  },
  eventPhase: {
    get: function () {
      return eventToState.get(this)?.eventPhase || Event.NONE;
    }
  },
  stopPropagation: {
    value: function () {
      throw new Error('omg')
    }
  },
  stopImmediatePropagation: {
    value: function () {
      throw new Error('omg')
    }
  },
  defaultPrevented: {
    get: function () {
      for(let context = eventToState.get(this)?.context; context; context = context.parent)
        if('prevented' in context) return context.prevented;
      return false;
    }
  },
  preventDefault: {
    value: function () {
      const context = eventToState.get(this)?.context;
      if(!context)
        throw new Error('.preventDefault() can only be called during or after propagation.');
      context.prevented = true;
      for (let childContext of context.contextChildren)
        childContext.prevented = true;
    }
  },
  enableDefault: {
    value: function (element) {
      const context = eventToState.get(this)?.context;
      if(!context)
        throw new Error('.enableDefault(element) can only be called during or after propagation.');
      const index = this.path.indexOf(element);
      if(index === -1)
        throw new Error('.enableDefault(element) can only be called on an element in the current path.');
      const childContext = context.contextChildren[index];
      childContext.prevented = false;
    }
  }
});