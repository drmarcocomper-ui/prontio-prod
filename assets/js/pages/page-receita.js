/**
 * PRONTIO - Receita (painel lateral no prontuário)
 *
 * Padrão PRONTIO:
 * - Usar callApiData() (retorna somente data e lança erro em success=false)
 * - Catálogo padronizado:
 *    Entidade: Remedios
 *    Action:   Remedios.Listar
 *    Retorno:  { remedios: [...] }
 *    Front:    variáveis "remedios"
 *
 * Importante:
 * - Este arquivo é o ÚNICO controlador do painel #receitaPanel.
 * - page-prontuario.js NÃO deve controlar render / catálogo / submit do painel.
 */

(function (global, document) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});
  const callApiData =
    (PRONTIO.api && PRONTIO.api.callApiData) ||
    global.callApiData ||
    function () {
      return Promise.reject(new Error("callApiData não disponível (assets/js/api.js não foi carregado?)"));
    };

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  /* =========================================================
   * ESTADO
   * ========================================================= */
  let itens = [];
  let nextItemId = 1;

  let remedios = [];
  let remediosCarregados = false;

  /* =========================================================
   * CATÁLOGO DE REMÉDIOS (PADRÃO)
   * ========================================================= */

  function getNomeRemedio_(r) {
    return String(
      (r && (r.Nome_Remedio || r.Nome_Medicacao || r.nomeRemedio || r.nomeMedicacao || r.nome || r.Nome || r.Medicamento)) || ""
    ).trim();
  }

  function getPosologiaRemedio_(r) {
    return String((r && (r.Posologia || r.posologia)) || "").trim();
  }

  function getViaRemedio_(r) {
    return String((r && (r.Via_Administracao || r.viaAdministracao || r.Via || r.via)) || "").trim();
  }

  function getQuantidadeRemedio_(r) {
    return String((r && (r.Quantidade || r.quantidade || r.Apresentacao || r.apresentacao)) || "").trim();
  }

  async function carregarCatalogoRemedios() {
    if (remediosCarregados) return remedios;

    const data = await callApiData({
      action: "Remedios.Listar",
      payload: { somenteAtivos: true, q: "", limit: 800 },
    });

    const lista = (data && (data.remedios || data.lista || data.items)) || (Array.isArray(data) ? data : []);
    remedios = Array.isArray(lista) ? lista : [];
    remediosCarregados = true;

    return remedios;
  }

  /* =========================================================
   * CONTEXTO DO PACIENTE
   * ========================================================= */

  function getContextoProntuario() {
    if (PRONTIO.prontuarioContexto) return PRONTIO.prontuarioContexto;

    try {
      const raw = localStorage.getItem("prontio.prontuarioContexto");
      if (raw) return JSON.parse(raw);
    } catch {}

    const id = qs("#prontuario-paciente-id")?.textContent.trim();
    return { idPaciente: id && id !== "—" ? id : "" };
  }

  function getIdPacienteAtual() {
    const ctx = getContextoProntuario();
    return ctx?.ID_Paciente || ctx?.idPaciente || "";
  }

  function getIdAgendaAtual() {
    const ctx = getContextoProntuario();
    return ctx?.ID_Agenda || ctx?.idAgenda || "";
  }

  /* =========================================================
   * ITENS
   * ========================================================= */

  function novoItem() {
    return {
      id: "MED_" + nextItemId++,
      // canônico
      idRemedio: "",
      remedio: "",
      posologia: "",
      via: "",
      quantidade: "",
      observacao: "",
    };
  }

  function garantirItem() {
    if (!itens.length) itens.push(novoItem());
  }

  function adicionarItem() {
    itens.push(novoItem());
    renderItens();
  }

  function removerItem(id) {
    itens = itens.filter((i) => i.id !== id);
    garantirItem();
    renderItens();
  }

  function atualizarItem(id, campo, valor) {
    const item = itens.find((i) => i.id === id);
    if (item) item[campo] = valor;
  }

  function limparSugestoes_() {
    qsa("#receitaItensContainer .receita-item-sugestoes").forEach((c) => (c.innerHTML = ""));
  }

  /* =========================================================
   * RENDER
   * ========================================================= */

  function renderItens() {
    const container = qs("#receitaItensContainer");
    if (!container) return;

    garantirItem();
    container.innerHTML = "";

    itens.forEach((item) => {
      const el = document.createElement("div");
      el.className = "receita-item-bloco";

      el.innerHTML = `
        <div class="receita-item-header">
          <span class="texto-menor texto-suave">Remédio</span>
          <button type="button" class="btn btn-xs btn-link js-remover">Remover</button>
        </div>

        <div class="receita-item-grid">
          <input class="js-rem" placeholder="Remédio" value="${escapeHtml(item.remedio)}">
          <input class="js-pos" placeholder="Posologia" value="${escapeHtml(item.posologia)}">
          <input class="js-via" placeholder="Via" value="${escapeHtml(item.via)}">
          <input class="js-qtd" placeholder="Quantidade" value="${escapeHtml(item.quantidade)}">
          <input class="js-obs" placeholder="Observação" value="${escapeHtml(item.observacao)}">
        </div>

        <div class="receita-item-sugestoes texto-menor"></div>
      `;

      const sug = el.querySelector(".receita-item-sugestoes");

      el.querySelector(".js-rem").addEventListener("input", (e) => {
        atualizarItem(item.id, "remedio", e.target.value);
        // quando o usuário digita manualmente, não temos idRemedio garantido
        atualizarItem(item.id, "idRemedio", "");
        mostrarSugestoes(e.target.value, sug, item);
      });

      el.querySelector(".js-pos").addEventListener("input", (e) => atualizarItem(item.id, "posologia", e.target.value));
      el.querySelector(".js-via").addEventListener("input", (e) => atualizarItem(item.id, "via", e.target.value));
      el.querySelector(".js-qtd").addEventListener("input", (e) => atualizarItem(item.id, "quantidade", e.target.value));
      el.querySelector(".js-obs").addEventListener("input", (e) => atualizarItem(item.id, "observacao", e.target.value));

      el.querySelector(".js-remover").addEventListener("click", () => removerItem(item.id));

      container.appendChild(el);
    });
  }

  /* =========================================================
   * AUTOCOMPLETE
   * ========================================================= */

  async function mostrarSugestoes(termo, container, item) {
    container.innerHTML = "";

    const lista = await carregarCatalogoRemedios();
    if (!lista.length) return;

    const t = (termo || "").toLowerCase().trim();
    if (!t) return;

    const matches = lista
      .filter((r) => getNomeRemedio_(r).toLowerCase().includes(t))
      .slice(0, 10);

    if (!matches.length) return;

    const ul = document.createElement("ul");
    ul.className = "receita-sugestoes-lista";

    matches.forEach((r) => {
      const nome = getNomeRemedio_(r);
      const id = String(r.idRemedio || r.ID_Remedio || r.idMedicamento || r.ID_Medicamento || "").trim();

      const li = document.createElement("li");
      li.innerHTML = `<button type="button"><strong>${escapeHtml(nome)}</strong></button>`;

      li.addEventListener("click", () => {
        atualizarItem(item.id, "idRemedio", id);
        atualizarItem(item.id, "remedio", nome);
        atualizarItem(item.id, "posologia", getPosologiaRemedio_(r));
        atualizarItem(item.id, "via", getViaRemedio_(r));
        atualizarItem(item.id, "quantidade", getQuantidadeRemedio_(r));
        renderItens();
      });

      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  /* =========================================================
   * SUBMIT
   * ========================================================= */

  function itensParaPayload() {
    // ✅ PADRONIZAÇÃO COMPLETA:
    // Agora envia SOMENTE o canônico que o backend entende:
    // { idRemedio, remedio, posologia, via, quantidade, observacao }
    return itens
      .filter((i) => i.remedio || i.posologia)
      .map((i) => ({
        idRemedio: i.idRemedio || "",
        remedio: i.remedio,
        posologia: i.posologia,
        via: i.via,
        quantidade: i.quantidade,
        observacao: i.observacao,
      }));
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    const idPaciente = getIdPacienteAtual();
    if (!idPaciente) return alert("Paciente não identificado.");

    const payload = {
      idPaciente,
      idAgenda: getIdAgendaAtual(),
      dataReceita: qs("#receitaData")?.value || "",
      observacoes: qs("#receitaObservacoes")?.value || "",
      itens: itensParaPayload(),
    };

    if (!payload.itens.length) return alert("Informe ao menos um remédio.");

    const acao =
      ev.submitter?.dataset?.acaoReceita === "rascunho"
        ? "Receita.SalvarRascunho"
        : "Receita.SalvarFinal";

    const resp = await callApiData({ action: acao, payload });

    const idReceita =
      resp?.idReceita ||
      resp?.ID_Receita ||
      resp?.receita?.idReceita ||
      resp?.receita?.ID_Receita ||
      "";

    if (acao === "Receita.SalvarFinal" && idReceita) {
      const pdf = await callApiData({
        action: "Receita.GerarPdf",
        payload: { idReceita },
      });

      const win = window.open("", "_blank");
      if (!win) return alert("Pop-up bloqueado. Libere para imprimir a receita.");
      win.document.open();
      win.document.write(pdf?.html || "");
      win.document.close();
    }

    itens = [novoItem()];
    renderItens();

    if (typeof PRONTIO.recarregarReceitasPaciente === "function") {
      PRONTIO.recarregarReceitasPaciente({ apenasUltima: true });
    }

    if (typeof PRONTIO.fecharReceitaPanel === "function") {
      PRONTIO.fecharReceitaPanel();
    }
  }

  /* =========================================================
   * PAINEL (abrir/fechar + hooks PRONTIO)
   * ========================================================= */

  function abrirPainel_() {
    const ctx = getContextoProntuario();
    if (!ctx?.idPaciente) {
      alert("Nenhum paciente selecionado.");
      return;
    }

    const panel = qs("#receitaPanel");
    if (!panel) return;

    panel.style.display = "flex";
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");

    const data = qs("#receitaData");
    if (data && !data.value) data.value = new Date().toISOString().slice(0, 10);

    carregarCatalogoRemedios().catch(() => {});
  }

  function fecharPainel_() {
    const panel = qs("#receitaPanel");
    if (!panel) return;

    limparSugestoes_();

    panel.classList.remove("is-open");
    panel.style.display = "none";
    panel.setAttribute("aria-hidden", "true");
  }

  function carregarItensReceitaNoForm_(listaItens, observacoes) {
    itens = [];
    nextItemId = 1;

    const list = Array.isArray(listaItens) ? listaItens : [];
    if (!list.length) {
      itens = [novoItem()];
    } else {
      itens = list.map((it) => ({
        id: "MED_" + nextItemId++,

        // ✅ prioriza o canônico salvo em ItensJson (Receita.gs)
        idRemedio: String(it.idRemedio || it.ID_Remedio || it.idMedicamento || it.ID_Medicamento || "").trim(),
        remedio: it.nomeRemedio || it.Nome_Remedio || it.remedio || it.medicamento || it.nome || it.Nome || "",
        posologia: it.posologia || it.Posologia || "",
        via: it.viaAdministracao || it.Via_Administracao || it.via || it.Via || "",
        quantidade: it.quantidade || it.Quantidade || "",
        observacao: it.observacao || it.Observacao || "",
      }));
    }

    const obs = qs("#receitaObservacoes");
    if (obs) obs.value = observacoes || "";

    renderItens();
    abrirPainel_();
  }

  /* =========================================================
   * INIT
   * ========================================================= */

  function init() {
    const form = qs("#formReceitaProntuario");
    const panel = qs("#receitaPanel");
    const btnAbrir = qs("#btnAcaoReceita");
    if (!form || !panel || !btnAbrir) return;

    btnAbrir.addEventListener("click", abrirPainel_);

    qsa("#receitaPanel [data-close-receita]").forEach((b) => {
      b.addEventListener("click", (ev) => { ev.preventDefault(); fecharPainel_(); });
    });

    panel.addEventListener("click", (ev) => {
      if (ev.target === panel) fecharPainel_();
    });

    qs("#btnAdicionarMedicamento")?.addEventListener("click", adicionarItem);
    form.addEventListener("submit", onSubmit);

    PRONTIO.abrirReceitaPanel = abrirPainel_;
    PRONTIO.fecharReceitaPanel = fecharPainel_;
    PRONTIO.carregarItensReceitaNoForm = carregarItensReceitaNoForm_;

    itens = [novoItem()];
    renderItens();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})(window, document);
