let count = 0;

function customLog(...args) {
  args.length === 1 && (args = args[0]);
  parent.postMessage(JSON.stringify(
    [location.hash.substr(1), args],
    (key, value) => value instanceof HTMLElement ? value.__id ??= count++ : value,
    2
  ), '*');
}

console.log = customLog;
window.addEventListener('error', customLog);