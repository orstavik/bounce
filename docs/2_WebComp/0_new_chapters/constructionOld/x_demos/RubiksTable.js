const style = `
<style>
  div {
    display: grid;
    grid-gap: 5px;
    border-radius: 1px;
    white-space: nowrap;
    background-color: #ccc;
    color: #444;
  }
  div[level="0"] {
    
  }
  div[level="1"] {
    grid-template-columns: 200px repeat(auto-fit, 25px);
    margin-top: 65px;
  }
  div[level="2"] {
    border-width: 0 0 0 5px;
    border-style: solid;
    border-color: white;
    grid-template-rows: repeat(auto-fit, 15px);
    grid-gap: 2px;
  }
  div[level="3"] {
    width: 25px;
    color: transparent;
    display: block;
  }

  div[level="1"]::before {
     content: attr(prop);
     display: inline-block;
     transform-origin: top left;
     transform: rotate(328deg);
  }
  div[level="2"]::before {
     color: #444;
     content: attr(prop);
     display: inline-block;
     transform-origin: top left;
     transform: rotate(328deg);
  }
  div[level="2"]:first-child > div[level="3"]::before {
    content: attr(prop);
    color: black;
    display: inline-block;
    margin-left: -200px;
  }
  div[level="2"]:first-child > div[level="3"] {
    /*margin-left: -20px;*/
  }


  div[value="a:a;id:x"],
  div[value="a:a;id:y"],
  div[value="true"] {
    background-color: green;
  }
  /*div[value="false"] {*/
  /*  background-color: red;*/
  /*}*/
  div[value="1"] {
    background-color: hsl(197, 100%, 90%);
  }
  div[value="2"] {
    background-color: hsl(197, 100%, 60%);
  }
  div[value="3"] {
    background-color: hsl(197, 100%, 40%);
  }
  div[value="a:a;id:x"],
  div[value="a:a;id:y"] {
    background-color: green;
  }
  div[value="a:a"] {
    background-color: red;
  }
  div[value="false"],
  div[value="#text"],
  div[value="null"],
  div[value="0"] {
    background-color: darkgrey;
  }

  div[prop^='constructor'] {
    border-color: green;
  }
  div[prop^='connected'] {
    border-color: purple;
  }
  div[prop^='script'] {
    border-color: grey;
  }
  div[prop^='attribute'] {
    border-color:  pink;
  }
  div[prop^='slotchange'] {
    border-color: dodgerblue;
  }

  div[prop~='micro'] {
    border-style: dotted;
  }
  
  div[prop="el"], div[prop="lastElementInDocument"] {
    display: none;
  }
  
  div[el='WEB-COMP#y'] > div{
    background-blend-mode: luminosity;
    background-image:  
        url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='1'><rect fill='white' x='0' y='0' width='30%' height='100%'/></svg>");        
    background-repeat: repeat;
  }

  :host([\\:level="2"]) div[level="2"]::before{
    color: red;
    /*here comes the rules that will let you select the view from one dimension only*/
  }
  :host([\\:level="3"]) div[level="3"]::before{
    color: green;
    /*here comes the rules that will let you select the view from one dimension only*/
  }
</style>
`;

const template = style + `
  <slot hidden></slot>
  <div>hello sunshine!!</div>
`;

function printObj2(prop, value, level = 0) {
  prop = prop.split('_').pop();
  const props = {prop, level, value};
  value instanceof Object && delete props.value;
  value?.el && (props.el = value.el);
  const content = value instanceof Object ?
    Object.entries(value).map(([k, v]) => printObj2(k, v, level + 1)).join('\n') :
    value;
  return `<div ${Object.entries(props).map(([k, v]) => `${k}="${v}"`).join(" ")}>${content}</div>`;
}

export class RubiksTable extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = template;
    this.shadowRoot.addEventListener('slotchange', () => this.slotchange());
    this.shadowRoot.addEventListener('click', e => this.onClick(e));
  }

  onClick(e) {
    if (this.hasAttribute(':prop')) {
      this.removeAttribute(':prop');
      this.removeAttribute(':level');
    } else {
      this.setAttribute(':prop', e.target.getAttribute('prop'));
      this.setAttribute(':level', e.target.getAttribute('level'));
    }
  }

  static get observedAttributes() {
    return [':prop', ':level'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    const prop = this.getAttribute(':prop');
    const level = this.getAttribute(':level');
    if (prop && level) {
      this.shadowRoot.styleSheets[0].addRule(`[level="${level}"]:not([prop="${prop}"])`, 'display:none')
    } else if (!prop && !level) {
      this.shadowRoot.styleSheets[0].deleteRule(this.shadowRoot.styleSheets[0].rules.length - 1);
    }
  }

  slotchange() {
    this.shadowRoot.querySelector('div').remove();
    this.shadowRoot.querySelector('slot').insertAdjacentHTML('afterend', printObj2("table", JSON.parse(this.childNodes[0].textContent)));
  }
}