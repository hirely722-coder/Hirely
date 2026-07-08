// Mock canvas implementation for Cloudflare Workers compatibility
export const createCanvas = () => ({
  getContext: () => ({
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray() }),
    putImageData: () => {},
  }),
});

export const loadImage = async () => ({});

export default {
  createCanvas,
  loadImage,
};
