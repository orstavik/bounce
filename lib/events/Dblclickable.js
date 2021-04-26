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

let lastClick;
let distance = 5;
let duration = 300;

function onclick(e) {
  if(!lastClick)
    return lastClick = e;
  if (tooLongPause(e, lastClick, duration) || tooFarApart(e, lastClick, distance))
    return lastClick = e;
  const dblclickTarget = topMostCommonTarget(e.composedPath(), lastClick.composedPath());
  lastClick = null;
  setTimeout(() => dblclickTarget.dispatchEvent(new MouseEvent('dblclick', e)));
}

export function dblclickSettings(newSettings){
  distance = newSettings.distance instanceof Number? newSettings.distance : distance;
  duration = newSettings.duration instanceof Number? newSettings.duration : duration;
}

export class Dblclickable extends HTMLElement {
  connectedCallback() {
    el.shadowRoot.addEventListener('click', onclick, {preventable: EventListenerOptions.PREVENTABLE, trustedOnly: true});
    cache.set(this, {last: null, duration: 300, distance: 5});
  }

  disconnectedCallback() {
    el.shadowRoot.removeEventListener('click', onclick);
    cache.delete(this);
  }
}
