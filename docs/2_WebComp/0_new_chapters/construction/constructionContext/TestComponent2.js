let counter = 0;

//language=CSS
const style = `
  div.row > * {
    box-sizing: border-box;
    height: 20px;
    width: 20px;
  }
  div[name] {
    display: inline-block;
    width: 400px;
    text-align: right;
  }
  div[key] {
    display: inline-block;
    border: 1px solid grey;
  }
  [value='false'] {
    background: white;
  }
  [value='true'] {
    background: green;
  }
  [value='true'] {
    background: green;
  }
  .disconnected{
    border-right: 3px solid red;
  }
  .empty{
    border-left: 3px solid orange;
  }
  .innerHTML, .insertAdjacentHTML, div[key='innerHTML'][value='true']{
    background-color: lightgrey;
  }
  .predictive, div[key='predictive'][value='true']{
    background-color: pink;
  }
  .createElement, .NEW, div[key='NEW'][value='true']{
    background-color: lightblue;
  }
  .cloneNode, div[key='cloneNode'][value='true']{
    background-color: yellow;
  }
  .upgrade, div[key='upgrade'][value='true']{
    background-color: lightgreen;
  }
  div[key='syncUpgrade'][value='true']{
    background-color: red;
  }
  
  .row.label > div[key] {
    color: black;
    writing-mode: tb;
    height: fit-content;
  }`;

function printLabel(element) {
  return `
<div class="row label">
    <div name></div>
    ${Object.entries(element).map(([k, v]) => `
      <div key="${k}">${k}</div>
    `).join('\n')}
</div>`;
}

function toRowHtml(name, element) {
  return `
<div class="row">
    <div name class="${name}">${name}</div>
    ${Object.entries(element).map(([k, v]) => `
      <div key="${k}" value="${v}"> </div>
    `).join('\n')}
</div>`;
}

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
    res = res[1].pop();
    delete res.el;
    this.shadowRoot.children[2].innerHTML =`
<style>${style}</style>
${this.hasAttribute('show-labels') ? printLabel(res) : ''}
${toRowHtml(this.id, res)}
`;
  }

  slotchange(e) {
    const slotted = this.shadowRoot.children[0].assignedElements();
    if (!slotted.length)
      return this.shadowRoot.children[2].innerHTML = "", this.shadowRoot.children[1].src = "";
    if (slotted.length > 1 || slotted[0].tagName !== 'NOSCRIPT')
      throw new Error('TestHtml can only contain a single <noscript></noscript> element.');

    this.shadowRoot.children[1].src =
      `data:text/html;charset=utf-8,${encodeURI(`<base href='${document.location.href}'/>${slotted[0].innerHTML}`)}#${this.#id}`;
    this.shadowRoot.children[2].innerHTML = `
<style>${style}</style>
${toRowHtml(this.id, {"hasParentNode":false,"hasAttributes":false,"hasChildNodes":false,"isConnected":false,"isLoading":false,"isCurrentScript":false,"isEventListener":false,"currentElementIsLastElement":false,"currentScriptIsLastElement":false,"syncUpgrade":false,"predictive":false,"NEW":false})}
`;
  }
}