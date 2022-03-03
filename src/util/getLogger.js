export const getLogger = (preset) => {
  return (...args) => console.log(...[preset, ...args]);
};
