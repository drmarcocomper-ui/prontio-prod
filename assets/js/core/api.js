/**
 * PRONTIO - Camada oficial de API (Front-end)
 *
 * Contrato obrigatório esperado do backend (Apps Script):
 *   { success: boolean, data: any, errors: string[] }
 *
 * Exporta:
 * - PRONTIO.api.callApiEnvelope({ action, payload }) -> retorna o envelope completo
 * - PRONTIO.api.callApiData({ action, payload })     -> retorna SOMENTE data e lança erro se success=false
 *
 * Observação:
 * - Este arquivo deve ser carregado ANTES dos scripts de páginas.
 */

(function (global) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});
  PRONTIO.api = PRONTIO.api || {};

  // -----------------------------
  // Descoberta da URL da API
  // -----------------------------
  function getApiUrl_() {
    if (PRONTIO.config && PRONTIO.config.apiUrl) return PRONTIO.config.apiUrl;
    if (global.PRONTIO_API_URL) return global.PRONTIO_API_URL;

    const body = global.document && global.document.body;
    if (body && body.dataset && body.dataset.apiUrl) return body.dataset.apiUrl;

    const meta =
      global.document && global.document.querySelector
        ? global.document.querySelector('meta[name="prontio-api-url"]')
        : null;
    if (meta && meta.content) return meta.content;

    return "";
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function normalizeError_(err) {
    if (!err) return "Erro desconhecido";
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  function ensureEnvelope_(json) {
    if (!json || typeof json !== "object") {
      throw new Error("Resposta inválida da API (não é JSON objeto).");
    }
    if (!("success" in json) || !("data" in json) || !("errors" in json)) {
      throw new Error("Resposta inválida da API (envelope fora do padrão PRONTIO).");
    }
    if (!Array.isArray(json.errors)) json.errors = [];
    return json;
  }

  function assertSuccess_(envelope) {
    if (envelope && envelope.success) return;
    const errs = (envelope && envelope.errors) || [];
    const msg = errs.length ? errs.map(e => (e && e.message) ? e.message : String(e)).join("\n") : "Falha na operação (success=false).";
    throw new Error(msg);
  }

  async function safeReadText_(resp) {
    try {
      return await resp.text();
    } catch {
      return "";
    }
  }

  /**
   * ✅ PADRONIZAÇÃO GLOBAL DE ACTIONS NO FRONT
   * - Tudo que ainda chamar Medicamentos.* será convertido para Remedios.*
   * - Isso ajuda a “limpar” o front sem caçar arquivos.
   */
  function normalizeAction_(action) {
    const a = String(action || "").trim();
    if (!a) return "";

    // Canoniza o prefixo do módulo
    if (a.indexOf("Medicamentos.") === 0) {
      console.warn("[PRONTIO] Action legada detectada (Medicamentos.*). Convertendo para Remedios.*:", a);
      return "Remedios." + a.substring("Medicamentos.".length);
    }
    if (a.indexOf("Medicamentos_") === 0) {
      console.warn("[PRONTIO] Action legada detectada (Medicamentos_*). Convertendo para Remedios_*:", a);
      return "Remedios_" + a.substring("Medicamentos_".length);
    }

    return a;
  }

  // -----------------------------
  // Implementação de chamada (fetch)
  // -----------------------------
  async function callApiEnvelope(args) {
    const apiUrl = getApiUrl_();
    if (!apiUrl) throw new Error("URL da API não configurada (apiUrl).");

    const actionRaw = args && args.action ? String(args.action) : "";
    const action = normalizeAction_(actionRaw);
    const payload = (args && args.payload) || {};

    if (!action) throw new Error("Parâmetro obrigatório ausente: action");

    let resp;
    try {
      resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ action, payload }),
        // credentials: "include",
      });
    } catch (e) {
      throw new Error("Falha de rede ao chamar API: " + normalizeError_(e));
    }

    if (!resp.ok) {
      const txt = await safeReadText_(resp);
      const extra = txt ? "\n\n" + txt.slice(0, 600) : "";
      throw new Error(`Erro HTTP ${resp.status} ao chamar API.${extra}`);
    }

    let json;
    try {
      json = await resp.json();
    } catch (e) {
      const txt = await safeReadText_(resp);
      const extra = txt ? "\n\n" + txt.slice(0, 600) : "";
      throw new Error("API não retornou JSON válido: " + normalizeError_(e) + extra);
    }

    return ensureEnvelope_(json);
  }

  async function callApiData(args) {
    const envelope = await callApiEnvelope(args);
    assertSuccess_(envelope);
    return envelope.data;
  }

  // -----------------------------
  // Exposição padrão PRONTIO
  // -----------------------------
  PRONTIO.api.callApiEnvelope = callApiEnvelope;
  PRONTIO.api.callApiData = callApiData;
  PRONTIO.api.assertSuccess = assertSuccess_;

  global.callApi = callApiEnvelope; // envelope
  global.callApiData = callApiData; // data
})(window);
