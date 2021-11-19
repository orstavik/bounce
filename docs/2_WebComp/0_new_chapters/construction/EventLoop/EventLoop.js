(function () {

  class EventLoop extends HTMLElement {
    #ready = false;

    connectedCallback() {
      //1. verify that we are the first in the DOM
      const eventLoopElement = document.querySelectorAll("event-loop");
      if (eventLoopElement.length !== 1 || eventLoopElement[0] !== this)
        throw new Error("There are two event-loop elements in the DOM at the same time");
      if (this.parentNode.tagName !== "HEAD" && this.parentNode.tagName !== "BODY")
        throw new Error("event-loop element is not either a direct child of either head or body element");

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
          HTMLEventElement.dispatchEvent(taskOrTime);
        } else if (taskOrTime.tagName === 'TASK') {
          HTMLTaskElement.start(taskOrTime);
        } else {
          this.timer = HTMLTaskElement.setTimeoutOG.call(window, () => this.findNextTask(), taskOrTime);
          break;
        }
      }
      this.active = false;
      EventTarget.cleanup && EventTarget.cleanup();
    }
  }

  customElements.define('event-loop', EventLoop);
})();