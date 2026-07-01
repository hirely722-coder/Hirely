export function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      const camel = k.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
      n[camel] = obj[k];
    });
    return n;
  }
  return obj;
}

export function keysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnake);
  }
  if (obj !== null && typeof obj === 'object') {
    const n: any = {};
    Object.keys(obj).forEach(k => {
      const snake = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      n[snake] = obj[k];
    });
    return n;
  }
  return obj;
}
