let i = 0;

const replacer = (k, v) => v instanceof HTMLElement ? (v.__id ??= i++) : v;

console.log = function customLog(...args) {
  args.length === 1 && (args = args[0]);
  parent.postMessage(JSON.stringify([location.hash.substr(1), args], replacer, 2), '*');
}