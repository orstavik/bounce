import {eventTargetName} from "./useCase1.js";

function addEventListeners(targets, res) {//todo push this into the usecase file?
  for (let el of targets) {
    let name = eventTargetName(el);
    el.addEventListener("click", function (e) {
      res.push(name.toUpperCase() + " ");
    }, true);
    el.addEventListener("click", function (e) {
      res.push(name.toLowerCase() + " ");
    });
  }
}

const tests = {
  0: [["first"]],
  1: [["last"]],
  2: [["first", "last"]],
  3: [["once"]],
  4: [["first", "once"]],
  5: [["last", "once"]],
  6: [["first", "last", "once"]],
  7: [["scoped"]],
  8: [["first", "scoped"]],
  9: [["last", "scoped"]],
  10: [["first", "last", "scoped"]],
  11: [["once", "scoped"]],
  12: [["first", "once", "scoped"]],
  13: [["last", "once", "scoped"]],
  14: [["first", "last", "once", "scoped"]],
  15: [["unstoppable"]],
  16: [["first", "unstoppable"]],
  17: [["last", "unstoppable"]],
  18: [["first", "last", "unstoppable"]],
  19: [["once", "unstoppable"]],
  20: [["first", "once", "unstoppable"]],
  21: [["last", "once", "unstoppable"]],
  22: [["first", "last", "once", "unstoppable"]],
  23: [["scoped", "unstoppable"]],
  24: [["first", "scoped", "unstoppable"]],
  25: [["last", "scoped", "unstoppable"]],
  26: [["first", "last", "scoped", "unstoppable"]],
  27: [["once", "scoped", "unstoppable"]],
  28: [["first", "once", "scoped", "unstoppable"]],
  29: [["last", "once", "scoped", "unstoppable"]],
  30: [["first", "last", "once", "scoped", "unstoppable"]],
  31: [["capture"]],
  32: [["first", "capture"]],
  33: [["last", "capture"]],
  34: [["first", "last", "capture"]],
  35: [["once", "capture"]],
  36: [["first", "once", "capture"]],
  37: [["last", "once", "capture"]],
  38: [["first", "last", "once", "capture"]],
  39: [["scoped", "capture"]],
  40: [["first", "scoped", "capture"]],
  41: [["last", "scoped", "capture"]],
  42: [["first", "last", "scoped", "capture"]],
  43: [["once", "scoped", "capture"]],
  44: [["first", "once", "scoped", "capture"]],
  45: [["last", "once", "scoped", "capture"]],
  46: [["first", "last", "once", "scoped", "capture"]],
  47: [["unstoppable", "capture"]],
  48: [["first", "unstoppable", "capture"]],
  49: [["last", "unstoppable", "capture"]],
  50: [["first", "last", "unstoppable", "capture"]],
  51: [["once", "unstoppable", "capture"]],
  52: [["first", "once", "unstoppable", "capture"]],
  53: [["last", "once", "unstoppable", "capture"]],
  54: [["first", "last", "once", "unstoppable", "capture"]],
  55: [["scoped", "unstoppable", "capture"]],
  56: [["first", "scoped", "unstoppable", "capture"]],
  57: [["last", "scoped", "unstoppable", "capture"]],
  58: [["first", "last", "scoped", "unstoppable", "capture"]],
  59: [["once", "scoped", "unstoppable", "capture"]],
  60: [["first", "once", "scoped", "unstoppable", "capture"]],
  61: [["last", "once", "scoped", "unstoppable", "capture"]],
  62: [["first", "last", "once", "scoped", "unstoppable", "capture"]]
};

const legalCombo1 = ["first", "once", "scoped", "unstoppable", "capture"];
const legalCombo2 = ["last", "once", "scoped", "unstoppable"];
const illegalCombo1 = ["last", "once", "scoped", "unstoppable", "capture"];

//we need to test that first and capture: true is always together and that last and capture: false is always together.
// and we need to test that the wrong combinations doesn't work neither.
//then we need to test that any combination of these two alternatives work with once, and scoped, and unstoppable.
//and that

function getCombinations(valuesArray) {
  const res = [];
  for (let i = 0; i < Math.pow(2, valuesArray.length); i++) {
    let temp = [];
    for (let j = 0; j < valuesArray.length; j++)
      (i & Math.pow(2, j)) && temp.push(valuesArray[j]);
    temp.length && res.push(temp);
  }
  res.sort((a, b) => a.length < b.length);
  return res;
}

const options = ["first", "last", "once", "scoped", "unstoppable", "capture"];
export const testListenerOptions = getCombinations(options);
const res = {}
let i = 0;
for (let testListenerOption of testListenerOptions) {
  const Last = testListenerOption.indexOf("last") > 0;
  const First = testListenerOption.indexOf("first") > 0;
  const Capture = testListenerOption.indexOf("capture") > 0;
  res[i++] = {
    combo: testListenerOption,
    error: (Last && Capture) || (First && !Capture)
  }
}
console.log(JSON.stringify(res));
debugger;

// export const basicPropTest = [];
//
// const propAlternatives = [
//   {composed: true, bubbles: true},
//   {composed: true, bubbles: false},
//   {composed: false, bubbles: true},
//   {composed: false, bubbles: false}
// ];
//
// for (let options of propAlternatives) {
//   basicPropTest.push({
//     name: `propagation: ${JSON.stringify(options)}`,
//     fun: function (res, usecase) {
//       const targets = usecase().flat(Infinity);
//       addEventListeners(targets, res);
//       targets[0].dispatchEvent(new Event("click", options));
//     },
//     expect: function (usecase) {
//       return makeExpectationBubblesComposed(usecase, options);
//     }
//   });
// }