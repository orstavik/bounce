(function () {
  // const uids = [];
  let counter = 0;

  const setAttributeOG = Element.prototype.setAttribute;
  const setAttributeNodeOG = Element.prototype.setAttributeNode;
  const getAttributeOG = Element.prototype.getAttribute;
  const getAttributeNodeOG = Element.prototype.getAttributeNode;

  function makeUidAttribute(element) {
    const att = document.createAttribute(':uid');
    const pos = counter++;
    att.value = pos;
    setAttributeNodeOG.call(element, att);
    // uids[pos] = new WeakRef(element);
    return att;
  }

  const errorMessage = "The property .uid / pseudo attribute ':uid' is protected. Use element.uid or element.getAttribute(':uid') to get/initiate uid value.";

  Object.defineProperties(Element.prototype, {
    uid: {
      get: function () {
        return this.getAttribute(':uid');
      },
      set: function (val) {
        throw new SyntaxError(errorMessage);
      }
    },
    setAttribute: {
      value: function (type, value) {
        if (type === ':uid')
          throw new SyntaxError(errorMessage);
        setAttributeOG.call(this, type, value);
      }
    },
    setAttributeNode: {
      value: function (node) {
        if (node.name === ':uid')
          throw new SyntaxError(errorMessage);
        setAttributeNodeOG.call(this, node);
      }
    },
    getAttribute: {
      value: function (type) {
        let val = getAttributeOG.call(this, type);
        val === null && type === ':uid' && (val = makeUidAttribute(this).value);
        return val;
      }
    },
    getAttributeNode: {
      value: function (type) {
        let val = getAttributeNodeOG.call(this, type);
        val === null && type === ':uid' && (val = makeUidAttribute(this));
        return val;
      }
    }
  });

  Object.defineProperty(document, 'uid', {
    set: function (val) {
      throw new SyntaxError(errorMessage);
    },
    get: function () {
      return 'doc';
    },
  });
  Object.defineProperty(window, 'uid', {
    set: function (val) {
      throw new SyntaxError(errorMessage);
    },
    get: function () {
      return 'win';
    },
  });
  Object.defineProperty(DocumentFragment.prototype, 'uid', {
    set: function (val) {
      throw new SyntaxError(errorMessage);
    },
    get: function () {
      return '#' + this.host.uid;
    },
  });
})();