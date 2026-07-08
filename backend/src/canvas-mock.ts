export const createCanvas = () => {
  throw new Error("Canvas is not supported on Cloudflare Workers.");
};
export default {
  createCanvas
};
