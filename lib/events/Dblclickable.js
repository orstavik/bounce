//assumes e.isTrusted and therefore that both paths must end with [..., body, html, document, window]
function topMostCommonTarget(pathA, pathB) {
  let res = document.body;
  for (let i = pathA.length - 5, j = pathB.length - 5; i >= 0 && j >= 0 && pathA[i] === pathB[j]; i--, j--)
    res = pathA[i];
  return res;
}

function tooFarApart(e1, e2, distance) {
  const distX = e1.x - e2.x;
  if (distX > distance || distX < distance)
    return true;
  const distY = e1.y - e2.y;
  return distY > distance || distY < distance;
}

function tooLongPause(now, then, duration) {
  return now.timeStamp - then.timeStamp > duration;
}

function onclick(e) {
  const mutateMePlease = cache.get(this);
  const {last, duration, distance} = mutateMePlease;
  if (!last || tooLongPause(e, last, duration) || tooFarApart(e, last, distance))
    return mutateMePlease.last = e;
  const dblclickTarget = topMostCommonTarget(e.composedPath(), last.composedPath());
  mutateMePlease.last = null;
  setTimeout(() => dblclickTarget.dispatchEvent(new MouseEvent('dblclick', e)));
}

const cache = new WeakMap();

//this Dblclick implementation skips script generated events (same as the native dblclick mixin)
//todo the browser doesn't make this preventable, but i think it should..
export function dblclickable(el, connectDisconnect = true, duration = 300, distance = 5) {
  if (connectDisconnect) {
    el.shadowRoot.addEventListener('click', onclick, {preventable: EventListenerOptions.PREVENTABLE, trustedOnly: true});
    cache.set(el, {last: null, duration, distance});
  } else {
    el.shadowRoot.removeEventListener('click', onclick);
    cache.delete(el);
  }
}

export function Dblclickable(Base, connectDisconnect = true, duration = 300, distance = 5) {
  return class Dblclickable extends Base {
    constructor() {
      super();
      dblclickable(this, true, duration, distance);
    }
  }
}