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

function updateDefault(e, value, element) {
  if (e.eventPhase === Event.NONE)
    throw new Error("you can't call preventDefault() before event propgation.");
  if (!element)
    return eventToState.get(e).context.prevented = value;
  const childIndex = e.path.indexOf(element);
  if(childIndex === -1)
    throw new Error('the element is not part of the path.');
  eventToState.get(e).context.contextChildren[childIndex].prevented = value;
}

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
      return eventToState.get(this)?.context?.prevented || false;
    }
  },
  preventDefault: {
    value: function (node) {
      updateDefault(this, true, node);
    }
  },
  enableDefault: {
    value: function (node) {
      updateDefault(this, false, node);
    }
  }
});