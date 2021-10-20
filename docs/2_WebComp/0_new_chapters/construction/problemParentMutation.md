## problem

```javascript
class WebComp extends HTMLElement {

  constructor() {
    super();
    //...
    const p = this.parentNode;
    this.parentNode?.parentNode?.appendChild(this);
    if (p !== this.parentNode) {
      console.log("bullshit", this);
    }
  }
}
```

this is possible in upgrade and in innerHTML, and probably cloneNode too. It is bad.