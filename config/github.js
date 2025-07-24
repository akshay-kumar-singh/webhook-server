const DEFAULT_HEADERS = {
  Accept: "application/vnd.github+json",
};

module.exports = {
  BASE_URL: "https://api.github.com",
  PER_PAGE: 100,
  DEFAULT_HEADERS,
  getAuthHeaders: (token) => ({
    Authorization: `Bearer ${token}`,
    ...DEFAULT_HEADERS,
  }),
};
