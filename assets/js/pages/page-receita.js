/**
 * PRONTIO - Receita (painel lateral no prontuário)
 * Melhorias UI:
 * - Sugestões com título + subtítulo (apresentação/via/tipo)
 * - HTML mais limpo (sem “caixa/tabela”)
 */

(function (global, document) {
  const PRONTIO = (global.PRONTIO = global.PRONTIO || {});
  const callApiData =
    (PRONTIO.api && PRONTIO.api.callApiData) ||
    global.callApiData ||
    function () {
      return Promise.reject(new Error("callApiData não disponível (API não carregada)."));
    };

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  let itens = [];
  let nextItemId = 1;

  let remedios = [];
  let remediosCarregados = false;

  function getNomeRemedio_(r) {
    return String(
      (r && (
        r.Nome_Remedio ||
        r.Nome_Medicacao ||
        r.nomeRemedio ||
        r.nomeMedicacao ||
        r.nome ||
        r.Nome ||
        r.Medicamento ||
        r.remedio
      )) || ""
    ).trim();
  }

  function getIdRemedio_(r) {
    return String(
      (r && (
        r.idRemedio ||
        r.ID_Remedio ||
        r.idMedicamento ||
        r.ID_Medicamento ||
        r.ID_Medicamento
      )) || ""
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

  function getTipoReceita_(r) {
    return String((r && (r.Tipo_Receita || r.tipoReceita || r.TipoReceita)) || "").trim();
  }

  function getApresentacao_(r) {
    return String((r && (r.apresentacao || r.Apresentacao)) || "").trim();
  }

  function buildSugSub_(r) {
    const parts = [];
    const ap = getApresentacao_(r);
    const via = getViaRemedio_(r);
    const qt = getQuantidadeRemedio_(r);
    const tipo = getTipoReceita_(r);

    if (ap) parts.push(ap);
    else if (qt) parts.push(qt);

    if (via) parts.push("Via: " + via);
    if (tipo) parts.push("Tipo: " + tipo);

    return parts.join(" • ");
  }

  async function carregarCatalogoRemedios() {
    if (remediosCarregados) return remedios;

    const data = await callApiData({
      action: "Medicamentos.ListarAtivos",
      payload: { q: "", limit: 800 }
    });

    const lista =
      (data && (data.remedios || data.medicamentos || data.lista || data.items)) ||
      (Array.isArray(data) ? data : []);

    remedios = Array.isArray(lista) ? lista : [];
    remediosCarregados = true;
    return remedios;
  }

  function novoItem() {
    return {
      id: "MED_" + nextItemId++,
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

  async function mostrarSugestoes(termo, container, item) {
    container.innerHTML = "";

    const lista = await carregarCatalogoRemedios();
    if (!lista.length) return;

    const t = (termo || "").toLowerCase().trim();
    if (!t) return;

    const matches = lista
      .filter((r) => getNomeRemedio_(r).toLowerCase().includes(t))
      .slice(0, 12);

    if (!matches.length) return;

    const ul = document.createElement("ul");
    ul.className = "receita-sugestoes-lista";

    matches.forEach((r) => {
      const nome = getNomeRemedio_(r);
      const sub = buildSugSub_(r);
      const id = getIdRemedio_(r);

      const li = document.createElement("li");
      li.innerHTML = `
        <button type="button">
          <div class="rx-sug-title">${escapeHtml(nome)}</div>
          ${sub ? `<div class="rx-sug-sub">${escapeHtml(sub)}</div>` : ""}
        </button>
      `;

      li.addEventListener("click", () => {
        atualizarItem(item.id, "idRemedio", id);
        atualizarItem(item.id, "remedio", nome);

        // auto-preencher se existir no catálogo
        atualizarItem(item.id, "posologia", getPosologiaRemedio_(r));
        atualizarItem(item.id, "via", getViaRemedio_(r));
        atualizarItem(item.id, "quantidade", getQuantidadeRemedio_(r));

        container.innerHTML = "";
        renderItens();
      });

      ul.appendChild(li);
    });

    container.appendChild(ul);
  }

  function itensParaPayload() {
    return itens
      .filter((i) => (i.remedio && i.remedio.trim()) || (i.posologia && i.posologia.trim()))
      .map((i) => ({
        idRemedio: String(i.idRemedio || "").trim(),
        remedio: String(i.remedio || "").trim(),
        posologia: String(i.posologia || "").trim(),
        via: String(i.via || "").trim(),
        quantidade: String(i.quantidade || "").trim(),
        observacao: String(i.observacao || "").trim(),
      }));
  }

  async function onSubmit(ev) {
    ev.preventDefault();

    const idPaciente = (PRONTIO.prontuarioContexto && (PRONTIO.prontuarioContexto.ID_Paciente || PRONTIO.prontuarioContexto.idPaciente)) ||
      (qs("#prontuario-paciente-id")?.textContent || "").trim();

    if (!idPaciente || idPaciente === "—") return alert("Paciente não identificado.");

    const payload = {
      idPaciente,
      idAgenda: (PRONTIO.prontuarioContexto && (PRONTIO.prontuarioContexto.ID_Agenda || PRONTIO.prontuarioContexto.idAgenda)) || "",
      dataReceita: qs("#receitaData")?.value || "",
      observacoes: qs("#receitaObservacoes")?.value || "",
      itens: itensParaPayload(),
    };

    if (!payload.itens.length) return alert("Informe ao menos um medicamento.");

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

  function abrirPainel_() {
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
