let downPath;

function onMousedown(e) {
  if (e.button === 0)
    downPath = e.composedPath();
}

function onMouseup(e) {
  if (e.button !== 0 || !downPath)
    return;
  e.preventDefault();                   //*browser behavior would not call preventDefault. But it should.
  const upPath = e.composedPath();
  const downPath2 = downPath;
  downPath = undefined;
  for (let i = downPath2.length - 1, j = upPath - 1; i >= 0 && j >= 0; j--, i--) {
    if (downPath2[i] !== upPath[j])
      return setTimeout(() => downPath2[i + 1].dispatchEvent(new MouseEvent('click', e)));
  }
}

export class Clickable extends HTMLElement {
  connectedCallback() {
    this.shadowRoot.addEventListener("mousedown", onMousedown, {trustedOnly: true});
    this.shadowRoot.addEventListener("mouseup", onMouseup, {preventable: EventListenerOptions.PREVENTABLE_SOFT, trustedOnly: true});
  }
  disconnectedCallback() {
    this.shadowRoot.removeEventListener("mousedown", onMousedown);
    this.shadowRoot.removeEventListener("mouseup", onMouseup);
  }
}

//comments:
//1. This event listener is assumed attached *once* to the <html>-element.
//   But, it could in principle be added to any element that one would wish.
//   It is much more performant to only apply clickable to the HTML element.
//2. In the browser, you cannot block 'click' events by calling preventDefault on mouseup.
//   But, there is no good reason why generating a click would be any less worthy of preventDefault than say
//   <a href>-navigation. On the contrary, if the click occured on an <a href>, then that click would have
//   default actions that should not conflict with other default actions on the preceding mouseup event.
//   This browser behavior seems off, idiosyncrasy, legacy code.