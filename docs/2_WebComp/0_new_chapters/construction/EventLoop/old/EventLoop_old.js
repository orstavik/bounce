(function () {

  function monkeyPatch(eventLoop, listeners) {
    //todo move this monkeypatching into the eventListener registry.
    MonkeyPatch.monkeyPatch(EventTarget.prototype, 'addEventListener', function addEventListener(og, type, listener) {
      og.call(this, type, listener);
      //todo find the old method where we added a closure here that routed to the new dispacthEvent on the target.
      // and then called stopImmediate and preventDefault on the native event..
      listeners.add(this, type, listener);
    });
    MonkeyPatch.monkeyPatch(EventTarget.prototype, "removeEventListener", function removeEventListener(og, type, listener) {
      og.call(this, type, listener);
      listeners.remove(this, type, listener);
    });
    MonkeyPatch.monkeyPatch(EventTarget.prototype, 'dispatchEvent', function dispatchEvent(og, e) {
      const targetId = this.getAttribute(":uid");
      if (!targetId)
        throw new Error("No :uid attribute on target element" + e.target);
      eventLoop.prepend(HTMLEventElement.makeEventElement(targetId, e));
    });
    return MonkeyPatch.monkeyPatch(window, 'setTimeout', function setTimeout(og, cb, ms) {
      if (window[cb.name] !== cb)
        throw new Error("setTimeout(function) only accepts functions whose function.name === window[name]");
      //todo we should also actually specify that the cb should be a frozen, non mutable property on window.
      //todo or, better, we should have two different tasks. those that are supposed to be resumable, and those that are same session only
      eventLoop.prepend(HTMLTaskElement.makeTaskElement(cb.name, ms));
    });
  }

  class EventLoop extends HTMLElement {
    #ready = false;
    #listeners;
    #setTimeoutOG;

    connectedCallback() {
      //1. verify that we are the first in the DOM
      const eventLoopElement = document.querySelectorAll("event-loop");
      if (eventLoopElement.length !== 1 || eventLoopElement[0] !== this)
        throw new Error("There are two event-loop elements in the DOM at the same time");
      if (this.parentNode.tagName !== "HEAD" && this.parentNode.tagName !== "BODY")
        throw new Error("event-loop element is not either a direct child of either head or body element");

      //2. highjack event listeners
      this.#setTimeoutOG = monkeyPatch(this, this.#listeners = new EventListenerRegistry());

      //3. trigger the EventLoop to process its events after DCL
      window.addEventListener('DOMContentLoaded', e => {
        this.#ready = true;
        this.childChangedCallback();
      });
    }

    childChangedCallback() {
      if (!this.#ready) return;
      this.active = false;
      this.timer = 0;
      this.findNextTask();
    }

    * #nextTask() {
      main: while (true) {
        const event = this.querySelector('event:not([\\:started])');
        if (event) {
          yield event;
          continue main;
        }
        let min = Infinity, now = Date.now();
        for (let task of this.querySelectorAll('task:not([\\:started])')) {
          let delay = HTMLTaskElement.delay(task, now);
          if (delay <= 0) {
            yield task;
            continue main;
          }
          min = Math.min(min, delay);
        }
        if (min === Infinity)
          return;
        yield min;
      }
    }

    findNextTask() {
      this.active = true;
      this.timer = clearTimeout(this.timer);
      for (let taskOrTime of this.#nextTask()) {
        if (taskOrTime.tagName === 'EVENT') {
          HTMLEventElement.dispatchEvent(taskOrTime, this.#listeners);
        } else if (taskOrTime.tagName === 'TASK') {
          HTMLTaskElement.start(taskOrTime);
        } else {
          this.timer = this.#setTimeoutOG.call(window, () => this.findNextTask(), taskOrTime);
          break;
        }
      }
      this.active = false;
      this.#listeners.cleanup();
    }
  }

  customElements.define('event-loop', EventLoop);
})();