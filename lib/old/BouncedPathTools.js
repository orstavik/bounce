//todo add native shadows
//todo convert parent to parent index
//todo add slot:true for slotting contexts.
// export function convertToBounceSequence(composedPath) {
//   //todo here we can add patch for the native elements that are the innermost targets, such as <button type=submit>
//   return convertToBounceSequenceImpl(composedPath);
// }
//
// function convertToBounceSequenceImpl(composedPath, parent) {
//   const root = composedPath.pop();
//   const context = {parent, root, path: [root]};
//   let res = [];
//   while (composedPath.length) {
//     if (composedPath[composedPath.length - 1] instanceof ShadowRoot) {
//       const shadow = convertToBounceSequenceImpl(composedPath, root);
//       res = [...shadow, ...res];
//       //todo } else if(check for native elements here??) {
//     } else {
//       const target = composedPath.pop();
//       context.path.unshift(target);
//       if (target instanceof HTMLSlotElement && composedPath[composedPath.length - 1]?.assignedSlot === target)
//         return [context, ...res];
//     }
//   }
//   return [context, ...res];
// }

// export function verifyBounceSequenceArguments(target, root) {
//   if (!(target instanceof EventTarget))
//     throw new Error('IllegalArgumentType: the "target" in bounceSequence(target, ...) must be an EventTarget.');
//   if (!(root instanceof DocumentFragment || root instanceof Window))
//     throw new Error('IllegalArgumentType: the "root" in bounceSequence(target, root) must be either true (as in composed: true), false (as in composed: false), or a Document or Window.');
// }
//
// function rootNodeIsCorrect(path, root) {
//   return path.every(el => root === window ? el === window || el === document || el.getRootNode() === document : el.getRootNode() === root);
// }
//
// export function verifyBouncedPath(bouncedPath) {
//   if (!bouncedPath.every(({root, path}) => rootNodeIsCorrect(path, root)))
//     throw new Error('BouncedPathBug: root node error.');
//   if (!!bouncedPath.find((context, i) => context.parent >= i))
//     throw new Error('BouncedPathBug 1: A UseD document is listed before its UseR document.');
//   bouncedPath[0].depth = 0;
//   for (let i = 1; i < bouncedPath.length; i++) {
//     const context = bouncedPath[i];
//     context.depth = bouncedPath[context.parent].depth + 1;
//   }
//   for (let i = 0; i < bouncedPath.length; i++) {
//     const usedContext = bouncedPath[i];
//     const parentContext = bouncedPath[usedContext.parent];
//     for (let j = usedContext.parent + 1; j < i; j++) {
//       const inTheMiddleContext = bouncedPath[j];
//       if (inTheMiddleContext.depth <= parentContext.depth)
//         throw new Error('BouncedPathBug 2: Maybe sibling document listed before a nested document?');
//     }
//   }
// }
//
// export function print(bouncedPath) {
//   return bouncedPath.map(({root, parent, path, depth, slotted}, i) =>
//     i + ': ' +
//     (slotted ? 's: ' : 'h: ') +
//     Array(depth).fill('  ').join('') +
//     parent + ': ' +
//     path.map(et => et.nodeName || 'window')
//   );
// }

