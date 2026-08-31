export const isValidDate = (value) => {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const formatDate = (value) => {
  if (!isValidDate(value)) {
    return "";
  }

  return new Date(value).toLocaleDateString();
};

export const formatDateTime = (value) => {
  if (!isValidDate(value)) {
    return "";
  }

  return new Date(value).toLocaleString();
};