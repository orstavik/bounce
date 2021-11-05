console.log = (function (i = 0) {
  return function customLog(...args) {
    args.length === 1 && (args = args[0]);
    parent.postMessage(JSON.stringify([location.hash.substr(1), args], (k, v) => v instanceof HTMLElement ? (v.__id ??= i++) : v, 2), '*');
  }
})();