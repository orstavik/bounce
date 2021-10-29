let count = 0;

function replacer(k, v) {
  if (v instanceof HTMLElement)
    return v.__id ??= count++;
  if (v instanceof ErrorEvent)
    return v.message.substr(v.message.indexOf(':') + 2);
  return v;
}

function customLog(...args) {
  args.length === 1 && (args = args[0]);
  parent.postMessage(JSON.stringify([location.hash.substr(1), args], replacer, 2), '*');
}

console.log = customLog;
window.addEventListener('error', customLog);