export const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return new Intl.NumberFormat().format(number);
};

export const displayValue = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
};