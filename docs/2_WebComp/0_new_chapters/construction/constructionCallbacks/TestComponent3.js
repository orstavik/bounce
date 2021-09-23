//language=CSS
const style = `
  * {
    --constructor: green;
    --connected: blue;
    --parent: blue;
    --attribute: orange;
    --slotchange: hotpink;
    --child: hotpink;
    --script: grey;
    --defined: black;
    --el1: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><rect fill='white' x='1.5' y='0' width='50%' height='100%'/></svg>");
    --el2: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='6'><circle fill='white' cx='3' cy='3' r='2'/></svg>");
    --micro: 8px solid white;
    --set: 50%;
    --error: 4px solid red;
  }

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

  .micro {
    border-top: var(--micro);
    border-right: var(--micro);
  }
  .set {
    border-radius: var(--set);
  }

  .el1 {
    background-image: var(--el1);
  }
  .el2 {
    background-image: var(--el2);
  }
  .constructor {
    background-color: var(--constructor);
  }
  .parent {
    background-color: var(--parent);
  }
  .connected {
    background-color: var(--connected);
  }
  .attribute {
    background-color: var(--attribute);
  }
  .slotchange {
    background-color: var(--slotchange);
  }
  .child {
    background-color: var(--child);
  }
  .l1 {
    border-bottom: var(--error);
  }

  .script {
    background-color: var(--script);
  }
  .definition {
    background-color: var(--defined);
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
  }`;

function findMissingActions(nowData, prevData) {
  const res = [];
  //1. add setAttribute multi/single
  const addedAtts = nowData.attributesLength - prevData.attributesLength;
  if (addedAtts)
    res.push({id: nowData.id, name: 'set attribute l' + addedAtts});
  //2. add setParentNode
  if (nowData.hasParentNode !== prevData.hasParentNode)
    res.push({id: nowData.id, name: 'set parent'});
  //3. appendChild / appendChildren
  const addedChildNodes = nowData.childNodesLength - prevData.childNodesLength;
  if (addedChildNodes)
    res.push({id: nowData.id, name: 'set child l' + addedChildNodes});
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

export class TestHtml extends HTMLElement {
  static #counter = 0;
  #id;

  constructor() {
    super();
    this.#id = TestHtml.#counter++;
    this.attachShadow({mode: "open"});
    this.shadowRoot.addEventListener('slotchange', e => this.slotchange(e));
    this.shadowRoot.innerHTML = `<slot></slot><iframe hidden></iframe><style>${style}</style><div></div>`;
    window.addEventListener('message', e => this.message(e));
  }

  message(e) {
    let res = JSON.parse(e.data);
    if (res instanceof Array && res[0] === this.#id + '') 
      this.render(analyze(res[1]));
  }

  render(ar) {
    this.shadowRoot.querySelector('div').innerHTML = `
<div class="row">
    <div name class="${this.id}">${this.id}</div>
    ${ar.map(({name, id}) => `<div class="el${id} ${name}" title="${name}"></div>`).join('\n')}
</div>`;
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