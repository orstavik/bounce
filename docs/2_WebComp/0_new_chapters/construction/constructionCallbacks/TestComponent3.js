//language=CSS
const style = `
  div.row > * {
    box-sizing: border-box;
    display: inline-block;
    height: 20px;
    width: 20px;
    overflow: hidden;
  }
  div[name] {
    width: 200px;
    text-align: right;
  }
  div[el] {
    border: 1px solid grey;
    color: transparent;
  }
  div[el="1"] {
    border-top: 4px solid black;
  }
  div[el="2"] {
    border-top: 4px solid grey;
  }

  div[cb^="constructor"] {
    background-color: green;
  }
  div[cb~="micro"] {
    background-blend-mode: luminosity;
    background-image:
        url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='1'><rect fill='white' x='0' y='0' width='30%' height='100%'/></svg>");
    background-repeat: repeat;
  }
  div[cb^="setParent"] {
    background-color: lightblue;
  }
  div[cb^="connected"] {
    background-color: blue;
  }
  
  div[cb^="setMultipleAttributes"], div[cb^="setAttribute"] {
    background-color: yellow;
  }
  div[cb^="attributeChanged"]{
    background-color: orange;
  }
  div[cb^="setMultipleChildNodes"], div[cb^="setChildNode"] {
    background-color: pink;
  }
  div[cb^="slotchange"] {
    background-color: hotpink;
  }

  div[cb^="setAttribute"] , div[cb^="setChildNode"] {
    border-bottom: 4px solid red;
  }

  div[cb^="script"] {
    background-color: grey;
  }
  div[cb^="defined"] {
    background-color: white;
  }

  .disconnected {
    border-right: 3px solid red;
  }
  .empty {
    border-left: 3px solid orange;
  }
  .innerHTML, .insertAdjacentHTML {
    background-color: lightgrey;
  }
  .predictive {
    background-color: pink;
  }
  .createElement, .NEW {
    background-color: lightblue;
  }
  .cloneNode {
    background-color: yellow;
  }
  .upgrade {
    background-color: lightgreen;
  }

  .row.label > div[key] {
    color: black;
    writing-mode: tb;
    height: fit-content;
  }`;

function toRowHtml(name, ar) {
  return `
<div class="row">
    <div name class="${name}">${name}</div>
    ${ar.map(ab => ab.split('::')).map(([cb, el]) => `
      <div el="${el}" cb="${cb}">${cb}</div>
    `).join('\n')}
</div>`;
}

function findMissingActions(nowData, prevData) {
  const res = [];
  //1. add setAttribute multi/single
  const addedAtts = nowData.attributesLength - prevData.attributesLength;
  if (addedAtts > 1)
    res.push({id: nowData.id, name: 'setMultipleAttributes'});
  else if (addedAtts === 1)
    res.push({id: nowData.id, name: 'setAttribute'});

  //2. add setParentNode
  if (nowData.hasParentNode !== prevData.hasParentNode)
    res.push({id: nowData.id, name: 'setParentNode'});

  //3. appendChild / appendChildren
  const addedChildNodes = nowData.childNodesLength - prevData.childNodesLength;
  if (addedChildNodes > 1)
    res.push({id: nowData.id, name: 'setMultipleChildNodes'});
  else if (addedChildNodes === 1)
    res.push({id: nowData.id, name: 'setChildNode'});
  return res;
}

function analyze(sequence) {
  let res = [];
  for (let i = 0; i < sequence.length; i++) {
    let nowData = sequence[i];
    let prevData = {attributesLength: 0, childNodesLength: 0, hasParentNode: false};
    for (let j = i - 1; j >= 0; j--) {
      const maybePrev = sequence[j];
      if (maybePrev.id === nowData.id) {
        prevData = maybePrev;
        break;
      }
    }
    const actions = findMissingActions(nowData, prevData);
    res = [...res, ...actions, nowData];
  }
  return res;
}


let counter = 0;

export class TestHtml extends HTMLElement {
  #id;

  constructor() {
    super();
    this.#id = counter++;
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<slot></slot><iframe hidden></iframe><div></div>`;
    window.addEventListener('message', e => this.message(e));
  }

  message(e) {
    let res = JSON.parse(e.data);
    if (!(res instanceof Array && res[0] === this.#id + ''))
      return;
    res = res[1];
    res = analyze(res);
    res = res.map(({name, id}) => `${name}::${id}`);
//${this.hasAttribute('show-labels') ? printLabel(res) : ''}
    this.shadowRoot.children[2].innerHTML = `
<style>${style}</style>
${toRowHtml(this.id, res)}
`;
  }

  slotchange(e) {
    const slotted = this.shadowRoot.children[0].assignedElements();
    if (!slotted.length)
      return this.shadowRoot.children[2].innerHTML = "", this.shadowRoot.children[1].src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');

    const htmlText = slotted[0].innerHTML;
    this.setAttribute('title', htmlText);
    this.shadowRoot.children[1].src =
      `data:text/html;charset=utf-8,${encodeURI(`<base href='${document.location.href}'/>${htmlText}`)}#${this.#id}`;
  }
}