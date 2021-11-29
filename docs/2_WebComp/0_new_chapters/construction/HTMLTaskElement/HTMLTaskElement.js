(function () {
  window.HTMLTaskElement = class HTMLTaskElement extends HTMLElement {

    getCallback() {
      return window[this.getAttribute(":cb")];
    }

    getArguments() {
      if (!this.children.length) {
        const txt = this.textContent.trim();
        return txt ? JSON.parse(txt) : [];
      }
      for (let c of this.children) {
        if (c.tagName === 'TASK' && !c.hasAttribute(':res'))
          return null;
      }
      return [...this.children].map(child => {
        if (child.tagName === 'EL')
          return document.querySelector(`[\\:uid="${child.textContent}"]`);
        if (child.tagName === 'JSON')
          return JSON.parse(child.textContent);
        if (child.tagName === 'TASK') {
          const res = child.getAttribute(':res');
          try {
            return JSON.parse(res);
          } catch (error) {
            return document.querySelector(res);
          }
        }
        throw new Error('illegal argument type');
      });
    }

    static #setResult(task, res) {
      task.setAttribute(":res", res instanceof HTMLElement ? res.getAttribute(':uid') : JSON.stringify(res));
      task.setAttribute(":finished", Date.now());
    }

    static makeTaskElement(cb, ms = 0, time = Date.now()) {
      const el = document.createElement('task');
      el.setAttribute(":cb", cb);
      el.setAttribute(":created", time);
      el.setAttribute(":delay", ms);
      el.setAttribute(":start", time + ms);
      return el;
    }

    static start(task) {
      task.setAttribute(":started", Date.now());
      Object.setPrototypeOf(task, HTMLTaskElement.prototype);
      try {
        return HTMLTaskElement.#invoke(task);
      } catch (error) {
        task.setAttribute(":error", error.message);  //todo this is untested
        throw error;
      }
    }

    static #invoke(task) {
      const cb = task.getCallback();
      if (!cb)
        throw new Error("Can't find the window[cb] any longer.. need to freeze stuff");
      const res = cb.apply(null, task.getArguments());
      if (!(res instanceof Promise))
        return HTMLTaskElement.#setResult(task, res);
      res
        .then(d => (HTMLTaskElement.#setResult(task, d), document.querySelector("event-loop").findNextTask()))
        .catch(e => task.setAttribute(":error", e.message));
    }

    static delay(task, now) {
      if (task.querySelectorAll(':scope > task:not([\\:res])').length)
        return Infinity;
      return parseInt(task.getAttribute(':start')) - now;
    }

    static ready(task, now) {
      return !task.querySelectorAll(':scope > task:not([\\:res])').length && parseInt(
        task.getAttribute(':start')) <= now;
    }
  }

  function monkeyPatch() {
    return MonkeyPatch.monkeyPatch(window, 'setTimeout', function setTimeout(og, cb, ms) {
      if (window[cb.name] !== cb)
        throw new Error("setTimeout(function) only accepts functions whose function.name === window[name]");
      //todo we should also actually specify that the cb should be a frozen, non mutable property on window.
      //todo or, better, we should have two different tasks. those that are supposed to be resumable, and those that are same session only
      const eventLoop = document.querySelector('event-loop');
      if (!eventLoop)
        throw new Error("No event-loop element in document");
      else
        eventLoop.prepend(HTMLTaskElement.makeTaskElement(cb.name, ms)); //todo: discuss task/events adding mechanism. Maybe not to .prepend? LIFO here????
    }).bind(window);
  }

  HTMLTaskElement.setTimeoutOG = monkeyPatch();
})();
