# Pattern: postPropagationCallback

In this demo, we make a postPropagationCallback. It works as follows.

1. With an event listener on an actual event, the final propagation node is identified. If that propagation node is the element itself, then we have a little problem. 
2. On the last node, a postPropagation callback is added.
3. Every time somebody adds a new event listener to the same node, then the event listener is removed and added again, keeping it last.
4. this happens until the event is at the last node, then this process will not occur.

## Solution

To ensure that an event listener runs last, we need to grab the addEventListener function on the target node, but only up until the current event listener has ended. simply add two properties for each event name on each event target for either the bubble or the capture phase.

```javascript
function setLastListener(node, type, lastListenerOG, lastOptions) {
  //todo identify if this *is* the last event listener.
  let lastListener;
  
  const newAddEventListener = function(extraType, extraListener, extraOptions){
    if(event.type === type && this === node && event.eventPhase !== Event.CAPTURING_PHASE) //this check assumes that some other function has already determined that this node is the last
      return;
    Event.prototype.addEventListener.call(this, extraType, extraListener, extraOptions);
    if(extraType !== type)
      return;
    node.removeEventListener(extraType, lastListener, lastOptions);
    node.addEventListener(extraType, lastListener, lastOptions);
  }

  lastListener = function(...args){
    delete node.addEventListener;
    lastListenerOG.call(this, ...args);
  }
  node.addEventListener(type, lastListener, lastOptions);
  node.addEventListener = newAddEventListener;
}
```

## problem: `last: true` && `once: true`...

```javascript
//target => "eventName"/"eventName capture" => {cb, options}
const targetTypeLast = new WeakMap();

function getLast(target, type, cb, options){
  const capture = options instanceof Object ? options.capture : !!options;
  const lookupName = capture ? type + " capture" : type;
  return targetTypeLast.get(target)?.get(lookupName);
}

function setLast(target, type, cb, options){
  const capture = options instanceof Object ? options.capture : !!options;
  const lookupName = capture ? type + " capture" : type;
  let targetsMap = targetTypeLast.get(target);
  if (!targetsMap)
    targetTypeLast.set(target, targetsMap = new WeakMap());
  if (options.once){                             //once
    const og = cb;                               //once
    const me = this;                             //once
    cb = function(e) {                           //once
      me.removeEventListener(type, cb, options); //once
      og.call(this, e);                          //once
    };                                           //once
  }                                              //once
  targetsMap.set(lookupName, {cb, options})
  return cb;                                     //once
}

const original = EventTarget.prototype.addEventListener;
Object.defineProperty(EventTarget.prototype, "addEventListener", {
  value: function(type, cb, options) {
    const oldLast = getLast(this, type, options);
    if (options?.last && oldLast)
        throw new Error("only one last event listener can be added to a target for an event type at a time.");
    if (options?.last) {
      cb = setLast(this, type, cb, options);
      return original.call(this, type, cb, options);
    } 
    if (oldLast){
      this.removeEventListener(type, oldLast.cb, oldLast.options);
      const res = original.call(this, type, cb, options);
      original.call(this, type, oldLast.cb, oldLast.options);
      return res;
    }    
    return original.call(this, type, cb, options);
  }
});

const original2 = EventTarget.prototype.addEventListener;
Object.defineProperty(EventTarget.prototype, "removeEventListener", {
  value: function(type, cb, options) {
    const last = getLast(this, type, cb, options);
    cb = last? last.cb : cb;
    original2.call(this, type, cb, options);
  }
});
```

## References

 * 