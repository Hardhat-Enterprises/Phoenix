export const logError = (...args) => {
  if (import.meta.env.DEV) {
    console.error(...args);
  }
};

export const logWarning = (...args) => {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
};