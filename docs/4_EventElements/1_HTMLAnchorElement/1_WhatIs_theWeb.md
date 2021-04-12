# WhatIs: the web?

Digital networks and connectivity is important. The internet gives us the ability to downloaded texts and movies to your screen from the other side of the world within milliseconds. At virtually no intrinsic cost. It is just beautiful. We all love it.

But, without links, digital connectivity would virtually be useless. Because, without links, you wouldn't find that text or movie. Links enable every web page, from your grandma's facebook posts to google search and netflix playlists, to show you where to go.

For example, if you add 15 links on each page and 5 seconds per page, in just under a minute a user could theoretically navigate to one of 15^12 = 129 trillion different web sites just by clicking. For comparison, the web is estimated to contain only 2 trillion different web pages today. Add on top of the links the socio-semantic algorithms of search-engines and social media, and you will find exactly what you want in a couple of seconds or even before you even knew it.

So, if the internet is humanity's new hive-mind, the digital network is the skull keeping everything together in one place while the links are the neurons that make up the brain. In short, the link is the defining feature of both the web and the browser.

## Links and navigating events

Let's not stop here. Let's extrapolate this logical argument. If links make up humanity's new hive-mind, then the makers of links are.. making life! Make two links and you are 1 trillionth divinity. Make an algorithm like Google search or Facebook like, and you are of course a God.

Ok, so how exactly is this divinity wielded? What did God do when she made light?
It was likely something like this: `<a href="http://www.example.com/public/light.html">`. Remember, in the early days, `https` did not exist. And then, God coupled implemented `window.open()` and called it a weeks worth of work and sent out the invoice. 

Now, this fact is usually a bit disappointing. Something as important and powerful as **the World Wide Web** *should be* more complex than a dumb `<a href>` and `window.open()`. Is that all it comes down to? Can't we do *more than that*?

The answer is... no. In principle, there is ***nothing*** more to it. The meaning of life is... too simple.

## WhatIs: routing

Technically, of course, the answer is that we can always *add more nuance and complexity*.

todo work from here.
There are actually four ways to make links:
`<a href>`, `<area href>`, `<form action>` and SVG `<a href>` tags.
More on this is in the next chapter [HowTo: make links](HowTo_browse.md).
However, the final, principal answer to this question is "no". We really can't do more than that. Links are really that dumb, only minor variations of `<a href>` tags.

## Implementing "the act of linking"

Ok, so if there is no complexity in making links, then surely magical complexity must be wielded when links are interpreted. Again, one must assume that behind powerful functionality always lies brittle, nail-biting technology. So, how does the Gods of technology teach the internet hive-mind to interpret dumb links?

Again, the answer is disappointing. The club of divinity accepts all applicants with a pulse and keyboard. You are not special. To interpret links is simply to either:
1. go to a new location by loading a new document or file or
2. go to a location within the current document by scrolling, toggle content or similar.

## The native router

To interpret links the browser has a builtin function: [the native router](HowTo_nativeRouter.md) (todo md file describing `window.open()` function). When given a url pointing to another document, the native router will download that resource and replace the document currently in view with that other document. When given a url with a #-location within the document, the native router will simply scroll to that location.

((todo move to native router chapter: 1. If the given url points to the same document location with a new hashlocation, then scroll to the `<a name="hashlocation">` or element with `id="hashlocation"`.
2. Otherwise, download the new document of the given url and replace the document you have with the newly downloaded document.))

Sure, the native router contains quite a few edge cases and some security checks,
mostly associated with legacy `<iframe>` support. But, at its core, the native router is utterly simple. Thus, in a couple of hours or even minutes, developers can make a [custom router]() to replace and/or complement the browser's native router.

## References

 * mdn window open
 * mdn location
 * before unload load etc.