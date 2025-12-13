// =====================================
// PRONTIO - assets/js/core/config.js
// Configuração global ÚNICA do front-end
// =====================================
//
// Regras:
// - Apenas este arquivo existe (sem config.dev.js / config.prod.js)
// - Ambiente é detectado automaticamente pelo hostname
// - Define PRONTIO.config.apiUrl (campo canônico)
// - NÃO usa window.PRONTIO_ENV
//

(function (global) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});
  PRONTIO.config = PRONTIO.config || {};

  // -------------------------------------
  // Detecção automática de ambiente
  // -------------------------------------
  function detectEnv_() {
    const host = (global.location && global.location.hostname) || "";

    // Ambiente DEV local
    if (host === "localhost" || host === "127.0.0.1") {
      return "dev";
    }

    // ✅ Ambiente DEV no GitHub Pages
    if (host.endsWith("github.io")) {
      return "dev";
    }

    // Default seguro
    return "prod";
  }

  const ENV = detectEnv_();

  // -------------------------------------
  // URLs da API (Apps Script)
  // -------------------------------------
  const API_URLS = {
    dev: "https://script.google.com/macros/s/AKfycbzNH8mqthPdHYP7IyNdJYn3EIt9xSmCGwPGg1bIo5aicgBuvz7HmTP-UAQ47F2RSIq0Eg/exec",
    prod: "https://script.google.com/macros/s/AKfycbzwvF6F1WTHUnU1Ysn0ob-BUOK2IlzmXWUX4E1kXSff761VV9gzLHS_Cr6WI_1DQ8ETeg/exec"
  };

  // -------------------------------------
  // Timeouts e parâmetros globais
  // -------------------------------------
  const DEFAULT_API_TIMEOUT = 20000; // ms

  // -------------------------------------
  // Campos canônicos (usados pelo core/api.js)
  // -------------------------------------
  PRONTIO.config.env = ENV;
  PRONTIO.config.apiUrl = API_URLS[ENV] || API_URLS.dev;
  PRONTIO.config.apiTimeout = DEFAULT_API_TIMEOUT;

  // -------------------------------------
  // Helpers públicos (opcionais)
  // -------------------------------------
  PRONTIO.config.isDev = function () {
    return PRONTIO.config.env === "dev";
  };

  PRONTIO.config.isProd = function () {
    return PRONTIO.config.env === "prod";
  };

  PRONTIO.config.getEnv = function () {
    return PRONTIO.config.env;
  };

  PRONTIO.config.getApiUrl = function () {
    return PRONTIO.config.apiUrl;
  };

  PRONTIO.config.getApiTimeout = function () {
    return PRONTIO.config.apiTimeout;
  };

  // -------------------------------------
  // Log amigável (somente DEV)
  // -------------------------------------
  if (PRONTIO.config.isDev() && global.console) {
    console.info(
      "[PRONTIO.config]",
      "ENV =", PRONTIO.config.env,
      "| API =", PRONTIO.config.apiUrl
    );
  }
})(window);
