function objToHtml(obj) {
  let res = '';
  for (let x in obj) {
    res += `<div x prop="${x}">${x}</div>`;
    for (let y in obj[x])
      res += `<div y prop="${y}">${y}</div><div value="${obj[x][y]}">${obj[x][y]}</div>`;
    res += `</div>`;
  }
  return res;
}

function outerX(obj) {
  const xs = Object.keys(obj);
  const ys = Object.keys(Object.values(obj)[0]);
  
  let head = '';
  let body = '';
  let res = `<th><td> </td>${xs.map(k=>`<td>${k}</td>`).join('')}</th>`;
  for (let [x] in obj) {
    head+=`<td>${x}</td>`;
    for (let y in obj[x])
      res += `<div y prop="${y}">${y}</div><div value="${obj[x][y]}">${obj[x][y]}</div>`;
    res += `</div>`;
  }
  return res;
}

//language=CSS
const style = `
  slot { display: block; width: 0; height: 0; overflow: hidden;}
  #table { display: grid; }
  #table > div { display: grid; }
  #table > div > div { display: grid; }
`;

export class RubiksCube2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});
    this.shadowRoot.innerHTML = `<style>${style}</style><slot></slot><table></table>`;
    this.shadowRoot.addEventListener('slotchange', () => this.slotchange());
  }

  slotchange() {
    this.shadowRoot.children[2].innerHTML = objToHtml(JSON.parse(this.childNodes[0].textContent));
  }
}

customElements.define('rubiks-cube2', RubiksCube2);