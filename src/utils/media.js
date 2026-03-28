const getBackendBaseUrl = () => {
  const backendBase = import.meta.env.VITE_BACKEND_BASE_URL;
  if (backendBase) return backendBase;

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) return apiBase.replace(/\/api\/?$/, "");

  return window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : window.location.origin;
};

export const resolveMediaUrl = (url) => {
  if (!url) return "";
  if (/^(https?:\/\/|blob:|data:)/i.test(url)) return url;

  const base = getBackendBaseUrl();
  if (!base) return url;

  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};
