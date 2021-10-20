let count = 0;

const og = console.log;
function customLog(...args) {
  og.call(console, ...args);
  const data = JSON.stringify(
    [location.hash.substr(1), args],
    (key, value) => value instanceof HTMLElement ? value.__id ??= count++ : value,
    2
  );
  parent.postMessage(data, '*');
}

console.log = customLog;
window.addEventListener('error', customLog);