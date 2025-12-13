// =====================================
// PRONTIO - assets/js/core/config.js
// Configuração global ÚNICA do front-end
// =====================================
//
// - DEV e PROD ficam em repos diferentes no GitHub Pages.
// - Detecta env por hostname + pathname.
// - Usa URL oficial do WebApp: https://script.google.com/macros/s/<ID>/exec
// - NÃO usa window.PRONTIO_ENV
//

(function (global) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});
  PRONTIO.config = PRONTIO.config || {};

  function detectEnv_() {
    const host = (global.location && global.location.hostname) || "";
    const path = (global.location && global.location.pathname) || "";

    // DEV local
    if (host === "localhost" || host === "127.0.0.1") return "dev";

    // GitHub Pages sem domínio próprio: decide pelo repo na URL
    if (host.endsWith("github.io")) {
      if (path.startsWith("/prontio-dev/")) return "dev";
      if (path.startsWith("/prontio-prod/")) return "prod";
      return "dev";
    }

    // futuro domínio próprio
    return "prod";
  }

  const ENV = detectEnv_();

  // ✅ URLs OFICIAIS do Apps Script WebApp (novos deployments que você informou)
  const API_URLS = {
    dev: "https://script.google.com/macros/s/AKfycbzIajYBY9VExAkSmzjmo_w92DRAEOh9sjuLwgD5pQJPFT-eib6SaYo_AJyckOMTElQj1w/exec",
    prod: "https://script.google.com/macros/s/AKfycbwGwSrgphYjR374ftYwbMczqnJzWTZvQXyyfcDGhyHsCGfuxbjd7FfhBEkUHoKrKC6AWQ/exec"
  };

  PRONTIO.config.env = ENV;
  PRONTIO.config.apiUrl = API_URLS[ENV] || API_URLS.dev;
  PRONTIO.config.apiTimeout = 20000;

  PRONTIO.config.isDev = function () { return PRONTIO.config.env === "dev"; };
  PRONTIO.config.isProd = function () { return PRONTIO.config.env === "prod"; };
  PRONTIO.config.getEnv = function () { return PRONTIO.config.env; };
  PRONTIO.config.getApiUrl = function () { return PRONTIO.config.apiUrl; };
  PRONTIO.config.getApiTimeout = function () { return PRONTIO.config.apiTimeout; };

  if (global.console) {
    console.info("[PRONTIO.config]", "ENV =", PRONTIO.config.env, "| API =", PRONTIO.config.apiUrl);
  }
})(window);
