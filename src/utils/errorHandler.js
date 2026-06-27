export function getErrorMessage(error) {
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || "Server error occurred.";
  } else if (error.request) {
    // No response received
    return "No response from server. Check your connection.";
  } else {
    return error.message || "Something went wrong.";
  }
}