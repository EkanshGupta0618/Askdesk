// Turn an API error into one readable message
export function getErrorMessage(error, fallback = "Something went wrong. Try again.") {
  if (!error?.response) return "Can't reach the server. Check that Django is running.";
  const data = error.response.data;
  if (typeof data?.detail === "string") return data.detail;
  if (data && typeof data === "object") {
    const first = Object.values(data).flat()[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

// Field-level errors from DRF, e.g. { email: ["Already exists."] } -> { email: "Already exists." }
export function getFieldErrors(error) {
  const data = error?.response?.data;
  if (!data || typeof data !== "object" || data.detail) return {};
  return Object.fromEntries(
    Object.entries(data).map(([field, messages]) => [field, [].concat(messages)[0]]),
  );
}