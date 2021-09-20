# HowTo: unify the construction race?

`HTMLElement`s can be constructed in many different ways:
1. the predictive parser interprets the elements in the main DOM,
2. the "upgrade" process triggered by `customElements.define`,
3. `new CustomElement()` constructors and `document.createElement(..)`, and
4. `innerHTML` and `insertAdjacentHTML()`.

## Problem: constructionRace

The different modes of cconstruction stems from the fact that HTML el *both* from template, script, *and* "template in script" (ie.  and its like). 
1

As we saw in the previous chapter, these modes of construction are different. When elements are constructed from template (predictive parser and upgrade), there are nuances in their However,  the HTML world (from templateand the JS world: 
The different sequences of callbacks during construction, and how to unify them?

The


## best method for parsing HTML

```javascript
const c = document.createElement('div');
function parseHTML(txt){
  c.insertAdjacentHTML('afterbegin', txt);  //or is .innerHTML just as quick?
  return Array.from(c2.childNodes).map(el => (el.remove(), el));
}
```

test of parsing methods:
```javascript
const c = document.createElement('div');
function parseHTML(txt){
  c.insertAdjacentHTML('afterbegin', txt);  //or is .innerHTML just as quick?
  return Array.from(c2.childNodes).map(el => (el.remove(), el));
}
function parseHTMLinner(txt){
  c.insertAdjacentHTML('afterbegin', txt);  //or is .innerHTML just as quick?
  return Array.from(c2.childNodes).map(el => (el.remove(), el));
}

function nativeJS(){
  const a = document.createElement('div');
  a.setAttribute('a', 'a');
  a.setAttribute('b', 'b');
  const b = document.createElement('div');
  b.setAttribute('a', 'a');
  b.setAttribute('b', 'b');
  const c = document.createElement('div');
  c.setAttribute('a', 'a');
  c.setAttribute('b', 'b');
  a.append(b);
  a.append(c);
  return a;
}
performance.mark('nativeJs');
const res = [];
for (let i = 0; i < 10000; i++)
  res.push(nativeJS());
performance.mark('nativeJs');
debugger;
const res2 = [];
for (let i = 0; i < 10000; i++)
  res2.push(nativeJS());

const res3 = [];
for (let i = 0; i < 10000; i++)
  res3.push(nativeJS());
```