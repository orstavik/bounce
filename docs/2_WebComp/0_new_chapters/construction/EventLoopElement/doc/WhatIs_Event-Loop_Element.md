# WhatIs: Event Loop Element

`<event-loop>`is the html version of the browser event loop.

The idea behind event-loop is very simple. There is an infinite loop in which the JavaScript engine waits for tasks, 
executes them, and waits again for new ones to appear.

The general algorithm:

1. As long as there are `<tasks>`s or `<event>`s.
   * Execute them, starting with the oldest one.
2. Do nothing until there is a new task and then go to step 1

The `<event-loop>` is primarily an "event queue". But, since the `<event-loop>` *writes* all events into the DOM. Explicitly.
If the <event> and <task> elements are not deleted from the DOM, then the content of the <event-loop> will also function
as an "event log", ie. killing two birds with one stone.

## What is `<task>`

Mdn says that 

 > A task is any JavaScript code which is scheduled to be run by the standard mechanisms such as initially starting to 
 >run a program, an event callback being run, or an interval or timeout being fired. These all get scheduled on the task queue.

Tasks get added to the task queue when:

* A new JavaScript program or subprogram executed (such as from a console, or by running the code in a `<script>` element) directly.
* An event fires, adding the event's callback function to the task queue.
* A timeout or interval created with `setTimeout()` or `setInterval()` reached, causing the corresponding callback to be added to the task queue.

each time `setTimeout()` is called it produce task,  which `<event-loop>` interprets into a <task> element. 

>That is, `<task>` is the html version of the task in the event loop of the browser.

### HowTo: create `<task>` element
In order to create a `<task>` it is necessary to keep track of every call to `setTimeout()`. This is done quite simply. 
We store the original function in a global variable, and define our own logic.

```javascript
const setTimeoutOG = window.setTimeout;
window.setTimeout = function setTimeout(cb, ms) {
  const timeoutElement = makeTaskElement(cb, ms);
  timeoutElement && document.querySelector("event-loop").prepend(timeoutElement);
};
```

When a `<task>` element created, attributes set that display basic `setTimeout()` information, as well as the creation 
time, and the time when the element should be executed. This is necessary to keep track of the timeout and temporarily
execute it later. 

Since it is not possible to pass a function as an attribute value, but it is possible to pass its name. Before add an attribute 
you have to make sure the passed function is in global scope. Obviously, this fact establishes some restrictions on the function. 
For example, it is not possible to pass a function which is in the local scope. The reason is that if you interpret the 
element back into a function, it will be impossible to access the original function. 

Of course, we can pass a local function as an object property, but this has a disadvantage. When the page reloads the
html attributes will be saved but the property won't. Using the attributes we recreate the original `setTimeout()`.

```javascript
function makeTaskElement(cb, ms = 0) {   
  const el = document.createElement('task');     
  el.setAttribute(":created", Date.now());    
  el.setAttribute(":delay", ms);
  el.setAttribute(":start", Date.now() + ms); 
  const name = cb.name;
  if (window[name]) {       
    el.setAttribute(':cb', name);
    el.cb = cb;
    return el;
  } else {
    name ? console.warn("Unable to add local function", name, "to", el) :
      console.warn("Unable to add an anonymous function to", el)
  }
}
```
### HowTo: nested tasks

There are times when necessary to process a chain of functions. In this case you can make nested `<task>`s.

If such a chain should use arguments, we can pass them inside `<task>`. Using this approach, `<event-loop>` handles the 
original function (defined with the `:cb` attribute) using arguments and defines its result directly in `<task>` using the `:res` attribute.

```html
    <task :created="1631618374265" :delay="3000" :start="1631789839346" :cb="plus">
        <task :created="1631618374264" :delay="2000" :start="1631789839346" :cb=multiply>
            <task :created="1631618374262" :delay="1000" :start="1631789839346" :cb=divide>
                <int>6</int>
                <int>1</int>
            </task>
            <int>2</int>
            <int>5</int>
        </task>
        <int>3</int>
    </task>
```

Thi is the same as  

```javascript
 setTimeout(plus(3, setTimeout(multiply(2, 5, setTimeout(divide(6, 1),1000))), 2000), 3000);
```   

## WhatIs <event>


### How to create `<event>` element

The `<event>` element created every time an event sent to the general event system using the `.dispatchEvent()` method.

Before you can make an event, you have to define new `uid` and `cb` properties of the original event manually. 

* `cb` - the name of the inverse function that must be in the global scope.
* `uid` - is the identifier of the target element.

```javascript
  h1.addEventListener("mousedown", function (e) {
    e.cb = doAlert;
    e.uid = this.getAttribute(":uid");
    h1.dispatchEvent(e)
  });
```

Similarly, creating a `<task>` element by tracing each call of `.dispatchEvent()`. 
```javascript
const dispatchEventOG = EventTarget.prototype.dispatchEvent;
Object.defineProperty(EventTarget.prototype, 'dispatchEvent', {
  value: function (e) {
    const eventElement = makeEventElement(e);
    document.querySelector("event-loop").prepend(eventElement);
  }
});
```
`MakeEventElement()` is used to create an `<event>` element. 

The function defines the basic attributes, 

* `:created` - time when the item created;
* `:type` - event type;
* `:target` - identifier of the target item;
* `:root` - identifier of the root node;
* `:x` - x coordinate (for mouse events``);
* `:y` - y coordinate.

```javascript
function makeEventElement(e) {
  const el = document.createElement('event')
  const target = document.querySelector(`[\\:uid="${(e.uid)}"]`);
  const rootNode = target?.getRootNode({composed: false});
  rootNode && (rootNode.uid = rootNode.body?.getAttribute(":uid"));
  el.original = e;
  el.setAttribute(":created", Date.now());
  el.setAttribute(':type', e.type);
  el.setAttribute(':target', e?.uid);
  el.setAttribute(':root', rootNode instanceof Node ? rootNode.uid : rootNode);
  e.x && el.setAttribute(':x', e.x);
  e.y && el.setAttribute(':y', e.y);
  return el;
}
```

## How to make `<event-loop>`

To start processing `<task>` and `<event>` elements, <event-loop> uses the DOMContentLoaded event in its constructor, which 
ensures that the HTML has been fully loaded and parsed.  The :now attribute is also defined, which is used as a relative 
time point when parsing inner elements timestamps.

```javascript
class EventLoop extends FirstConnectedCallbackMixin {
  constructor() {
    super();
    document.addEventListener('DOMContentLoaded', () => {
      if (document.readyState === "loading") return;
      this.setAttribute(":now", Date.now());
      this.findNextTask();
    });
  }
  ...
}
```

To track the first addition of `<event-loop>` to the DOM, [firstConnectedCallback()](https://github.com/orstavik/JoiComponents/blob/a347a7151efe1733dfcfc83518595304eeda3ea9/book/chapter8_HowToMakeMixins/11_Pattern_FirstCallback.md)
is used instead of the traditional `connectedCallback()`. 

   - `this.active` - is used to define the active element and ensure that several elements are not processed at the same time.
   - `this.timer` - identifier `setTimeout()`.

The MutationObserver is used to track the addition of new items.  Each time a callback is triggered, `this.active` becomes
 true and `findNextTask()` is called.  

```javascript
  firstConnectedCallback() {
    this.active = false;
    this.timer = 0;
    const mo = new MutationObserver(mr => {
      if (this.active || !mr[0].addedNodes.length)
        return;
      this.active = true;
      this.findNextTask();
    });
    mo.observe(this, {childList: true});
    const eventLoopElement = document.querySelectorAll("event-loop");
    if (eventLoopElement.length > 1)
      throw new Error("There are two event-loop elements in the DOM at the same time");
    const parentElementTagNAme = eventLoopElement[0].parentNode.tagName;
    if (parentElementTagNAme !== "HEAD" && parentElementTagNAme !== "BODY")
      throw new Error("event-loop element is not either a direct child of either head or body element");
  }
```

The `findNextTask()` keeps track of all items that have been added and are waiting to execute or end a delay.

The pending `<task>` elements contain only those attributes which were defined at creation. Therefore, the main guideline
for waiting elements is the absence of `:started `attribute. 
In case the call time has not come yet, the original `setTimeout()` is called (which is stored in a global variable) 
to repeat the check at a suitable time.
When the element waits for its call time, a `:started` attribute added that represents the start time of processing. 
 
```javascript
  findNextTask() {
    const eventLoop = document.querySelector("event-loop");
    const waitingEvent = document.querySelector('event-loop > event:not([\\:started]');
    if (waitingEvent)
      this.runTask(waitingEvent);
    let nonResolvedTask = [...document.querySelectorAll('task:not([\\:started]')].filter(task =>
      !task.hasAttribute(":started") && !task.children.length || !![...task?.children].filter(
        c => !c.hasAttribute(":started") && c.getAttribute(":start") > eventLoop.getAttribute(
        ":now")).length).pop();
    if (!nonResolvedTask)
      return this.active = false;
    const timeToWait = (parseInt(nonResolvedTask.getAttribute(':start')) || 0) - new Date().getTime();
    if (timeToWait <= 0) {
      this.runTask(nonResolvedTask);
    } else {
      this.timer = setTimeoutOG(() => this.findNextTask(), timeToWait);
      this.active = false;
    }
   }
```

After the end of the delay time (`<event>` element process without delay check.), the item handled with `runTask()`. 

```javascript
runTask(unresolvedTask) {
    this.active = true;
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = 0;
    if (unresolvedTask?.tagName === "EVENT") {
      const target = document.querySelector(`[\\:uid='${unresolvedTask.getAttribute(":target")}']`);
      if (!target)
          throw new Error("There are no :target attribute on event element " + unresolvedTask.uid)
      unresolvedTask.setAttribute(":started", Date.now());
      propagateEvent.call(target, unresolvedTask);
      runCallback(unresolvedTask); 
      unresolvedTask.setAttribute(":finished", Date.now());
    }
    else {
      unresolvedTask.setAttribute(":started", Date.now());
      let res = unresolvedTask.children?.length ? this.interpretTask(unresolvedTask) : runCallback(unresolvedTask);
      typeof res?.then === 'function' ? res.then(data => {
        this.finishTask(unresolvedTask, data)
      }) : this.finishTask(unresolvedTask, res);
      let isAsync = !unresolvedTask.getAttribute(":res");
      let startedTimestamp = unresolvedTask.getAttribute(":started");
      if (isAsync && startedTimestamp) // if it has :started, but no :res, then it is :async-started.
        unresolvedTask.setAttribute(":async-started", startedTimestamp)
      if (isAsync)
        unresolvedTask.setAttribute(":async-finished", Date.now()); // if it has :res, then it is :finished :async-finished.  
    }
  }
```
First of all, `runTask()` defined `this.active` as `true` and clears `this.timer`, which means starting to process the item.

 
#### `<event>` element processing
To process an `<event>` event, you need to get the target element using the `:target` attribute.
Then the `:started` attribute defined, which shows the time when the event started to be processed.

The event propagation done with `propagateEvent()`.
 
```javascript
function propagateEvent(el) {
  const e = convertElementToEvent(el);
  if (e.eventPhase !== Event.NONE)
    throw new Error("Cannot dispatch the same Event twice.");
  let root = el.getAttribute(':root');
  if (root === 'true') root === true;
  else if (root === 'false') root === false;
  else if (root) root === document.querySelector(`[\\:uid="${root}"]`);
  root = calculateRoot(this, root, e);
  let innermostTarget = this;
  const composedPathIn = composedPath(this, root);
  if (innermostTarget.shadowRoot)
    composedPathIn.unshift(innermostTarget = innermostTarget.shadowRoot);
  eventStack.push(e);
  initEvent(e, composedPathIn);
  const type = e.type;
  const topMostContext = bounceSequence(innermostTarget, root);
  for (let context of ContextIterator(topMostContext)) {
    updateEvent(e, 'context', context);
    if (e.defaultPrevented)
      continue;
    for (let target of context.path) {
      const list = listeners.get(target, type);
      if (list) {
        updateEvent(e, 'currentTarget', target);
        for (let fun of list)
          fun?.call(target, e);
      }
    }
  }
  updateEvent(e, 'eventPhase', Event.FINISHED);
  updateEvent(e, 'context', topMostContext);
  updateEvent(e, 'currentTarget', undefined);

  eventStack.pop() &&
  !eventStack.length &&
  listeners.cleanup();
}
```

`convertElementToEvent()` convert an `<event>` element into a js object using previously defined `.original `properties or attributes.

```javascript
function convertElementToEvent(el) {
  if (el.original)
    return el.original;
  const e = new Event(el.getAttribute(':type'));
  e.timeStamp = el.getAttribute(':created');
  e.x = el.getAttribute(':x');
  e.y = el.getAttribute(':y');
  el.hasAttribute(':default-prevented') && e.preventDefault();
  return e;
}
```
Then the event propagates. 

[Detailed description of the bouncing event described here.](https://github.com/orstavik/JoiEvents/blob/faa4e7a9db58a89487e967d1eeeb633b53cbf5d3/docs/1d2_composedEvents/3_0_WhatIs_EventBounce.md)

After propagation, the original callback, whose name defined at the beginning, is called, using `runCallback()`.

```javascript
function runCallback(el) {
  let cb = el.cb || window[el.getAttribute(":cb")] //todo add new
  if (!cb) return
  let res = cb.call(el);
  return res;
}
```
At the end, the `:finished` attribute is defined, which shows the end time of the processing.

#### `<task>` element processing

 Before the start of processing `<task>` element, the `:started` attribute defined. It represents the time at which the handler function is active.
The processing of `<task>` depends on its type. If it is nested the processing done with `interpretTask()`, if not - `runTimer()`.

After the handler function executed the result of the execution obtained with `finishTask()`, the `:res` and `:finished`
 attributes defined. `:res` contains the result of the execution, `:finished `- the time the function finished. The next 
`findNextTask()` loop also started.

```javascript
  finishTask(currentTask, data) {
    if (!data)
      currentTask.setAttribute(":res-type", undefined);
    currentTask.setAttribute(":res", data);
    currentTask.setAttribute(":finished", Date.now());
    return this.findNextTask();
  }
```

`Promise.then()` is used to handle asynchronous functions. 
In addition, calls to asynchronous functions marked with `:async-started` and :`async-finished` attributes, which store
the start and end of the asynchronous operation.

The `interpretTask()` allows to retrieve the original function using its name from `:cb` attribute.  

`convertArguments()` function allows to correctly interpret string values into the type defined by the tag name of the 
internal elements. Calls the original function with interpreted arguments and defines `:res-type`, for next operations.

```javascript
  interpretTask(timeoutElement) {
    let cb;
    if (timeoutElement.getAttribute(":cb"))
      cb = window[timeoutElement.getAttribute(":cb")];
    const args = this.convertArguments(timeoutElement);
    if (!cb) return;
    let res = cb.call(null, args);
    if (!res) return timeoutElement.getAttribute(":res");
    timeoutElement.setAttribute(":res-type", timeoutElement.lastElementChild.tagName);
    return res;
  }

  convertArguments(timeoutElement, data) {
    let args = [...timeoutElement.children].map(child => {
      let textContent = child.textContent;
      let dataType = child.tagName;
      //3. process <str, <json, <int, <boolean, <float, <el>
      if (dataType === 'TASK') {
        textContent = child.getAttribute(':res');
        dataType = child.getAttribute(':res-type');
        if (!dataType) return console.warn(":res attribute specified without :res-type attribute in ", child)
      }
      if (dataType === 'STR')
        return textContent;
      if (dataType === 'JSON')
        return JSON.parse(textContent);
      if (dataType === 'INT')
        return Number.parseInt(textContent);
      if (dataType === 'BOOLEAN')
        return JSON.parse(textContent);
      if (dataType === 'FLOAT')
        return Number.parseFloat(textContent);
      if (dataType === 'undefined')
         console.error("undefined result at ", timeoutElement, "check ", timeoutElement.firstElementChild.getAttribute(":cb"), "() returned value");
    });
    return args;
  }
```

Non nested `<task>` handles with `runCallback()`. It also retrieves the original function using its name from `:cb` attribute.  

## References

1. [MDN: Using microtasks in JavaScript with queueMicrotask()](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide);
2. [MDN: .dispatchEvent()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent);
2. [MDN: .setTimeout()](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout).
