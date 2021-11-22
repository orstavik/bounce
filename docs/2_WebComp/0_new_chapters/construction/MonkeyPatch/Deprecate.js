//The click needs to be deprecated as it gives a second entry point to the native dispatchEvent call.
MonkeyPatch.deprecate(HTMLElement.prototype, "click");

//