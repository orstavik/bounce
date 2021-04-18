const nativeDefaultActions = {
  A: {
    click: function (el, e) {
      return el.hasAttribute('href') && (() => window.open(el.href));
    },
    mousedown: function (el, e) {
      return el.hasAttribute('href') && e.button === 1 && (() => window.open(el.href, '_blank'));
    }
  },
  DETAILS: {
    click: function (el, e) {
      const firstSummaryChildInPath = el.children[0].tagName === "SUMMARY" && e.path.includes(el.children[0]);
      return firstSummaryChildInPath && (() => el.open = !el.open);
    }
  },
  BUTTON: {
    click: function (el, e) {
      if (el.form && el.type === 'submit')
        return () => el.form.requestSubmit();
      if (el.form && el.type === 'reset')
        return () => el.form.reset();
      // if (event.type === 'mousedown' && e.button === 1)
      //   return () => setTimeout(()=>el.form.requestSubmit()); //todo do I need to do this in a blank window? if so, how?
    }
  },
  INPUT: {
    click: function (el, e) {
      if (el.type === 'checkbox')                                          //todo these are ctrl+z, fix later
        return () => el.checked = !el.checked;                             //
      if (el.type === 'radio')                                             //
        return () => alert('here comes the radiobutton default action');   //todo
      if (el.form && el.type === 'submit')
        return () => el.form.requestSubmit();
      if (el.form && el.type === 'reset')
        return () => el.form.reset();
    },
    mousedown: function (el, e) {
      return e.button === 1 && el.type === 'text' && (() => alert("Todo PASTE default action as in copy'paste"));  //todo
    },
    keydown: function (el, e) {
      return (el.type === 'text' && el.form && e.key === 'enter') && (() => el.form.requestSubmit());
    }
  },
  TEXTAREA: {
    mousedown: function (el, e) {
      return e.button === 1 && (() => alert("Todo PASTE default action as in copy'paste"));  //todo
    },
    keydown: function (el, e) {
      //todo don't remember where/when the deadkey conversion happens
      return () => el.dispatchEvent(new KeyboardEvent('beforeinput', event));
    },
    beforeinput: function (el, e) {
      //todo don't remember where/when the deadkey conversion happens
      return () => alert('todo: here comes the default action of adding text to a textarea value.');
    }
  },
  OPTION: {
    mousedown: function (el, e) {
      if (el.parentNode instanceof HTMLSelectElement ||
        (el.parentNode instanceof HTMLOptGroupElement && el.parentNode instanceof HTMLSelectElement) ||
        (el.parentNode instanceof HTMLOptGroupElement && el.parentNode instanceof HTMLSelectElement)
      )
        return () => alert('here comes the default action for the option element');
    }
  }
}

//todo to speed up, replace the closures with abstract functions that assumes this as the element and e as the event.
//assumes event.isTrusted && target.tagName.indexOf('-') === -1
export function getNativeDefaultAction(target, event) {
  const mightHaveA = nativeDefaultActions[target.tagName];
  if(!mightHaveA) return;
  const mightHaveB = mightHaveA[event.type];
  if(!mightHaveB) return;
  return mightHaveB(target, event);
}

export function findNativeDefaultAction(composedPath, event) {
  for (let target of composedPath) {
    if (target instanceof HTMLElement && target.tagName.indexOf('-') <= 0) {
      const defaultAction = getNativeDefaultAction(target, event);
      if (defaultAction)
        return {target, defaultAction};
    }
  }
  return {};
}