export const getApiErrorState = (error) => {
  if (
    error?.status === 401 ||
    error?.message === "Please sign in before loading backend data."
  ) {
    return "auth";
  }

  if (error?.status === 403) return "forbidden";
  if (error?.status === 404) return "notfound";
  if (error?.code === "INVALID_DETAIL_RESPONSE") return "empty";

  return "error";
};
