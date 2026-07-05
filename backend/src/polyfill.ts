// Polyfill browser globals for pdfjs-dist in Node/Bun environment
if (typeof globalThis !== 'undefined') {
  (globalThis as any).DOMMatrix = (globalThis as any).DOMMatrix || class DOMMatrix {
    constructor() {}
  };
  (globalThis as any).ImageData = (globalThis as any).ImageData || class ImageData {
    constructor() {}
  };
  (globalThis as any).Path2D = (globalThis as any).Path2D || class Path2D {
    constructor() {}
  };
}
