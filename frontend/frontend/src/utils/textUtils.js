export const safeTrim = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

export const capitalizeFirst = (value) => {
  const text = safeTrim(value);

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const truncateText = (value, maximumLength = 100) => {
  const text = safeTrim(value);

  if (text.length <= maximumLength) {
    return text;
  }

  return `${text.slice(0, maximumLength).trimEnd()}…`;
};