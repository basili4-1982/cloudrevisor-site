(function () {
  "use strict";

  const state = {
    group: null,
    type: "all",
    search: "",
    peak: 70,
    chat: [
      {
        role: "bot",
        text: "Здравствуйте. Спросите про любой ресурс — отвечу по данным парка. Например: «Почему billing-db-02 в зоне риска?»",
        tools: [],
      },
    ],
    typing: false,
    tokensUsed: 0,
    account: "",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const GROUP_TITLES = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.title]));
  GROUP_TITLES.risk = "Риск";
  GROUP_TITLES.norm = "Норма";
  GROUP_TITLES.other = "Прочее";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function fmt(n) {
    return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
  }

  function num(n) {
    return Math.round(n).toLocaleString("ru-RU");
  }

  function estimateTokens(text) {
    return Math.max(20, Math.ceil(String(text).length / 3.5));
  }

  const ACCOUNT_KEY = "cloudrevisor:demo:account";
  const TOKEN_PREFIX = "cloudrevisor:demo:tokens:";

  function storageGet(key) {
    try { return localStorage.getItem(key) || ""; } catch (error) { return ""; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (error) { /* no-op */ }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (error) { /* no-op */ }
  }

  function normalizeAccount(value) {
    return String(value || "").trim().toLowerCase();
  }

  function loadAccount() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = normalizeAccount(params.get("account") || params.get("email"));
    if (fromUrl) {
      storageSet(ACCOUNT_KEY, fromUrl);
      return fromUrl;
    }
    return normalizeAccount(storageGet(ACCOUNT_KEY));
  }

  function tokenKey(account) {
    return TOKEN_PREFIX + account;
  }

  function loadTokens(account) {
    const stored = Number(storageGet(tokenKey(account)));
    if (!Number.isFinite(stored) || stored < 0) return 0;
    return Math.min(DEMO_META.tokenBudget, Math.round(stored));
  }

  function saveTokens(account, value) {
    if (!account) return;
    storageSet(tokenKey(account), String(Math.min(DEMO_META.tokenBudget, Math.round(value))));
  }

  function plural(n, forms) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }

  function factor() {
    return 1 + (state.peak - 70) * 0.025;
  }

  function categorySavings(cat) {
    return Math.round(cat.savings * factor());
  }

  function totalSavings() {
    return CATEGORIES.reduce((sum, cat) => sum + categorySavings(cat), 0);
  }

  function riskItems() {
    return RISK.filter((item) => state.peak >= item.minPeak);
  }

  function groupBadge(group) {
    const cls = group === "risk" ? "group-badge group-badge--risk" : "group-badge";
    return `<span class="${cls}">${escapeHtml(GROUP_TITLES[group] || group)}</span>`;
  }

  function filteredResources() {
    const q = state.search.trim().toLowerCase();
    return RESOURCES.filter((r) => {
      if (state.group && r.group !== state.group) return false;
      if (state.type !== "all" && r.type !== state.type) return false;
      if (!q) return true;
      return `${r.name} ${r.owner}`.toLowerCase().includes(q);
    }).sort((a, b) => {
      if (a.risk !== b.risk) return a.risk ? -1 : 1;
      return b.savings - a.savings;
    });
  }

  // ---------- Summary ----------

  function renderSummary() {
    const total = totalSavings();
    const risks = riskItems().length;
    $("#billValue").textContent = fmt(DEMO_META.bill);
    $("#savingsValue").textContent = fmt(total);
    $("#savingsSub").textContent = `${Math.round((total / DEMO_META.bill) * 100)}% счёта · 8 групп`;
    $("#riskValue").textContent = `${risks} ${plural(risks, ["ресурс", "ресурса", "ресурсов"])}`;
    $("#riskCount").textContent = String(risks);
  }

  // ---------- Categories ----------

  function renderCategories() {
    const grid = $("#categoryGrid");
    grid.innerHTML = CATEGORIES.map((cat) => {
      const count = cat.id === "reserve" ? "~40% парка" : `${cat.count} ${cat.unit}`;
      const active = state.group === cat.id ? " is-active" : "";
      return `
        <button class="cat-card${active}" type="button" data-group="${cat.id}">
          <span class="cat-icon tone-${cat.tone}">${cat.icon}</span>
          <span>
            <span class="cat-title">${escapeHtml(cat.title)}</span>
            <span class="cat-value">${fmt(categorySavings(cat))}</span>
            <span class="cat-sub">${count}</span>
          </span>
          <span class="cat-arrow">→</span>
        </button>`;
    }).join("");

    $$(".cat-card", grid).forEach((btn) => {
      btn.addEventListener("click", () => {
        const group = btn.dataset.group;
        state.group = state.group === group ? null : group;
        state.type = "all";
        state.search = "";
        $("#searchInput").value = "";
        setActiveChip("all");
        renderCategories();
        renderResources();
        $("#resourcesPanel").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  // ---------- Risk ----------

  function renderRisk() {
    const items = riskItems();
    const list = $("#riskList");
    if (!items.length) {
      list.innerHTML = `<div class="table-empty">При целевом пике ${state.peak}% риск не найден.</div>`;
      return;
    }
    list.innerHTML = items.map((item) => `
      <button class="risk-row" type="button" data-risk="${item.id}">
        <span class="risk-dot"></span>
        <span class="risk-name">${escapeHtml(item.name)}</span>
        <span class="risk-tag">риск</span>
        <span class="risk-open">Открыть</span>
        <span class="risk-reason">${escapeHtml(item.reason)}</span>
      </button>`).join("");

    $$(".risk-row", list).forEach((row) => {
      row.addEventListener("click", () => openRisk(row.dataset.risk));
    });
  }

  // ---------- Resources table ----------

  function renderResources() {
    const list = filteredResources();
    const title = state.group ? GROUP_TITLES[state.group] || "Ресурсы" : "Ресурсы";
    $("#resourcesTitle").textContent = title;
    $("#resourcesSub").textContent = `${list.length} из ${DEMO_META.resources} · сортировка по экономии`;
    $("#tableEmpty").hidden = list.length > 0;

    $("#resourceRows").innerHTML = list.map((r) => {
      const savings = r.savings > 0 ? fmt(r.savings) : "—";
      return `
        <tr data-resource="${r.id}">
          <td>
            <div class="res-name">${escapeHtml(r.name)}</div>
            <div class="res-owner">${escapeHtml(r.owner)}</div>
          </td>
          <td><span class="type-badge">${escapeHtml(r.type)}</span></td>
          <td>${groupBadge(r.group)}</td>
          <td class="res-flow">${escapeHtml(r.current)} → <b>${escapeHtml(r.proposed)}</b></td>
          <td class="num"><span class="res-savings${r.savings ? "" : " res-savings--zero"}">${savings}</span></td>
          <td class="row-open">›</td>
        </tr>`;
    }).join("");

    $$("#resourceRows tr").forEach((row) => {
      row.addEventListener("click", () => {
        const resource = RESOURCES.find((r) => r.id === row.dataset.resource);
        if (!resource) return;
        if (resource.risk) openRisk(resource.id);
        else openResource(resource.id);
      });
    });
  }

  // ---------- Chat ----------

  function renderTokens() {
    const budget = DEMO_META.tokenBudget;
    const used = Math.min(state.tokensUsed, budget);
    const pct = Math.min(100, (used / budget) * 100);
    const bar = $("#tokenBar");
    if (!bar) return;

    $("#tokenAccount").textContent = state.account || "—";
    $("#tokenUsage").textContent = `${num(used)} / ${num(budget)}`;
    bar.style.width = `${pct}%`;
    bar.classList.toggle("is-warn", pct >= 70 && pct < 100);
    bar.classList.toggle("is-full", pct >= 100);
    $("#tokenCost").textContent = `${(used * DEMO_META.tokenPrice).toFixed(2).replace(".", ",")} ₽`;
    $("#tokenMeter").classList.toggle("is-exhausted", used >= budget);

    const exhausted = used >= budget;
    const locked = !state.account || exhausted;
    const input = $("#chatInput");
    const button = $("#chatForm button");
    if (input) {
      input.disabled = locked;
      input.placeholder = !state.account
        ? "Введите почту, чтобы начать"
        : exhausted
          ? "Лимит аккаунта исчерпан — смените аккаунт"
          : "Задать вопрос...";
    }
    if (button) button.disabled = locked;
  }

  function renderChat() {
    const log = $("#chatLog");
    log.innerHTML = state.chat.map((msg) => {
      const tools = msg.tools && msg.tools.length
        ? `<div class="tools">${msg.tools.map((t) => `<span class="tool-chip">${escapeHtml(t)}</span>`).join("")}</div>`
        : "";
      return `<div class="msg msg--${msg.role}">${escapeHtml(msg.text)}${tools}</div>`;
    }).join("");

    if (state.typing) {
      log.insertAdjacentHTML("beforeend", `<div class="msg msg--bot"><span class="typing"><i></i><i></i><i></i></span></div>`);
    }
    log.scrollTop = log.scrollHeight;
  }

  function answerFor(text) {
    const found = CHAT_ANSWERS.find((a) => a.match.test(text));
    if (found) return found;
    return {
      text: "В демо я отвечаю по данным парка. Спросите про billing-db-02, orders-api-04 или общую экономию.",
      tools: ["get_summary"],
    };
  }

  function sendChat(text) {
    const value = String(text || "").trim();
    if (!value || state.typing) return;

    if (!state.account) {
      showAccountGate();
      return;
    }

    if (state.tokensUsed >= DEMO_META.tokenBudget) {
      state.chat.push({
        role: "bot",
        text: `Лимит токенов демо исчерпан (${num(DEMO_META.tokenBudget)}). Сбросьте демо, чтобы продолжить.`,
        tools: [],
      });
      renderChat();
      return;
    }

    state.chat.push({ role: "user", text: value, tools: [] });
    state.typing = true;
    renderChat();

    window.setTimeout(() => {
      const answer = answerFor(value);
      state.typing = false;
      state.chat.push({ role: "bot", text: answer.text, tools: answer.tools || [] });
      state.tokensUsed = Math.min(
        DEMO_META.tokenBudget,
        state.tokensUsed + estimateTokens(value) + estimateTokens(answer.text) + 320
      );
      saveTokens(state.account, state.tokensUsed);
      renderTokens();
      renderChat();
    }, 650);
  }

  // ---------- Charts ----------

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 997;
    return h;
  }

  function series(seed, n, base, peak) {
    const values = [];
    for (let i = 0; i < n; i++) {
      let v = base + Math.sin((i + seed) * 0.7) * 3 + Math.sin((i + seed) * 0.23) * 2 + ((i * seed) % 5);
      if (i >= n - 4) v = peak - (n - 1 - i) * 7;
      values.push(Math.max(2, Math.round(v)));
    }
    return values;
  }

  function chartSvg(values, threshold, options = {}) {
    const w = 520;
    const h = 148;
    const padX = 6;
    const padTop = 10;
    const padBottom = 18;
    const max = Math.max(100, ...values) + 4;
    const barGap = 2;
    const barW = Math.max(3, (w - padX * 2 - barGap * (values.length - 1)) / values.length);
    const y = (v) => h - padBottom - (v / max) * (h - padTop - padBottom);
    const bars = values.map((v, i) => {
      const x = padX + i * (barW + barGap);
      const top = y(v);
      const fill = v > threshold ? "#dc2626" : options.color || "#2563eb";
      return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${(h - padBottom - top).toFixed(1)}" rx="1.5" fill="${fill}"/>`;
    }).join("");
    const line = `<line x1="${padX}" x2="${w - padX}" y1="${y(threshold)}" y2="${y(threshold)}" stroke="#059669" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    const label = `<text x="${w - padX}" y="${y(threshold) - 4}" text-anchor="end" font-size="9" fill="#059669">${threshold}%</text>`;
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="График нагрузки">
      ${bars}${line}${label}
      <line x1="${padX}" x2="${w - padX}" y1="${h - padBottom}" y2="${h - padBottom}" stroke="#e2e8f0"/>
    </svg>`;
  }

  function riskSeries(item) {
    if (item.id === "billing-db-02") {
      return [72, 74, 71, 76, 78, 73, 79, 81, 76, 79, 82, 78, 80, 79];
    }
    return [84, 86, 88, 87, 90, 89, 88, 91, 90, 92, 89, 88];
  }

  // ---------- Drawer ----------

  function openDrawer(html) {
    const drawer = $("#drawer");
    drawer.innerHTML = html;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    $("#drawerBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    bindDrawer();
  }

  function closeDrawer() {
    $("#drawer").classList.remove("is-open");
    $("#drawer").setAttribute("aria-hidden", "true");
    $("#drawerBackdrop").hidden = true;
    document.body.style.overflow = "";
  }

  function openResource(id) {
    const r = RESOURCES.find((item) => item.id === id);
    if (!r) return;
    if (r.risk) {
      openRisk(id);
      return;
    }

    const isReserve = r.group === "reserve";
    const isDisk = r.type === "Диск" || r.type === "Снапшот" || r.type === "Тариф";
    const noAction = r.group === "norm" || r.group === "other";
    const verdictLabel = noAction ? "Без рекомендации" : isReserve ? "Смена тарифа" : GROUP_TITLES[r.group] || "Рекомендация";
    const verdictText = noAction ? "Данных достаточно, чтобы не рекомендовать изменение." : r.note || "Можно изменить без риска для пиков";
    const values = series(hash(r.name) + 3, 30, isDisk ? 4 : 9, isDisk ? 12 : 62);
    const chart = isDisk
      ? `<div class="chart-card"><div class="chart-head"><span>${escapeHtml(r.current)}</span><b>${escapeHtml(r.proposed)}</b></div><p class="chart-head" style="margin-top:8px">${escapeHtml(r.note || "Проверка перед изменением")}</p></div>`
      : `<div class="chart-card">
          <div class="chart-head"><span>Нагрузка CPU · 30 дней</span><b>P99.5 ${r.p995}% · целевой ${state.peak}%</b></div>
          ${chartSvg(values, 70)}
        </div>`;

    openDrawer(`
      <div class="drawer__head">
        <button class="back-btn" type="button" data-back>← Назад к парку</button>
        <span class="pill" style="background:#eff6ff;color:#2563eb">${escapeHtml(r.type)}</span>
      </div>
      <div class="drawer__body">
        <div class="drawer-title">
          <div>
            <h2>${escapeHtml(r.name)}</h2>
            <p>${escapeHtml(r.role)} · ${escapeHtml(r.owner)}</p>
          </div>
        </div>

        <div class="verdict">
          <div>
            <div class="verdict__label">${escapeHtml(verdictLabel)}</div>
            <div class="verdict__text">${escapeHtml(verdictText)}</div>
          </div>
          <div class="verdict__value">${r.savings ? fmt(r.savings) + "<small>/мес</small>" : "—"}</div>
        </div>

        <div class="spec-grid">
          <div class="spec"><span>Сейчас</span><b>${escapeHtml(r.current)}</b></div>
          <div class="spec-arrow">→</div>
          <div class="spec spec--next"><span>Предлагаем</span><b>${escapeHtml(r.proposed)}</b></div>
        </div>

        <div class="section-label">Нагрузка</div>
        ${chart}

        ${isDisk ? "" : `<div class="replay">
          <button class="btn btn--small" type="button" data-replay>Прогнать историю</button>
          <p>История на новой конфигурации</p>
          <span class="replay-result" data-replay-result>—</span>
        </div>`}

        <div class="section-label">Что сделать</div>
        <div class="steps">
          ${noAction
            ? `<div class="step"><i>1</i><span>Оставить конфигурацию</span></div><div class="step"><i>2</i><span>Проверить через месяц</span></div><div class="step"><i>3</i><span>Не менять без новых данных</span></div>`
            : isReserve
              ? `<div class="step"><i>1</i><span>Перевести на резерв на 1 год</span></div><div class="step"><i>2</i><span>Проверить стабильность нагрузки 3 месяца</span></div><div class="step"><i>3</i><span>Согласовать с финдиректором</span></div>`
              : `<div class="step"><i>1</i><span>${escapeHtml(r.proposed === "Остановить" ? "Остановить ресурс и проверить владельца" : "Изменить до " + r.proposed)}</span></div><div class="step"><i>2</i><span>Проверить пики и запас на выбросы</span></div><div class="step"><i>3</i><span>Согласовать с владельцем и внедрить</span></div>`
          }
        </div>

        <div class="drawer-ask">
          <input type="text" data-ask-input placeholder="Спросить про ${escapeHtml(r.name)}..." aria-label="Вопрос про ресурс">
          <button type="button" data-ask>Спросить</button>
        </div>
      </div>`);
  }

  function openRisk(id) {
    const item = RISK.find((r) => r.id === id);
    if (!item) return;
    const isIops = item.id === "billing-db-02";
    const threshold = isIops ? 68 : 85;
    const chart = chartSvg(riskSeries(item), threshold, { color: "#dc2626" });
    const metrics = item.metrics.map(([label, value]) => `
      <div class="metric metric--bad"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("");

    openDrawer(`
      <div class="drawer__head">
        <button class="back-btn" type="button" data-back>← Назад к парку</button>
        <span class="pill pill--red">риск</span>
      </div>
      <div class="drawer__body">
        <div class="drawer-title">
          <div>
            <h2>${escapeHtml(item.name)}</h2>
            <p>${escapeHtml(item.role)} · не уменьшать</p>
          </div>
        </div>

        <div class="verdict verdict--risk">
          <div>
            <div class="verdict__label">Не уменьшать</div>
            <div class="verdict__text">${escapeHtml(item.detail)}</div>
          </div>
          <div class="verdict__value">${escapeHtml(item.reason)}</div>
        </div>

        <div class="section-label">${isIops ? "IOPS · 14 дней" : "Пик CPU · 12 дней"}</div>
        <div class="chart-card">
          <div class="chart-head"><span>${isIops ? "IOPS" : "Пик"}</span><b>${isIops ? "норма 68%" : "порог 85%"}</b></div>
          ${chart}
        </div>

        <div class="section-label">Метрики</div>
        <div class="metric-grid">${metrics}</div>

        <div class="section-label">Что сделать</div>
        <div class="steps">
          <div class="step"><i>1</i><span>Оставить конфигурацию как есть</span></div>
          <div class="step"><i>2</i><span>${isIops ? "Проверить диск: нужен быстрее" : "Проверить пик и запас"}</span></div>
          <div class="step"><i>3</i><span>Обсудить с владельцем ресурса</span></div>
        </div>

        <div class="drawer-ask">
          <input type="text" data-ask-input placeholder="Спросить про ${escapeHtml(item.name)}..." aria-label="Вопрос про ресурс">
          <button type="button" data-ask>Спросить</button>
        </div>
      </div>`);
  }

  function bindDrawer() {
    const drawer = $("#drawer");
    const back = $("[data-back]", drawer);
    if (back) back.addEventListener("click", closeDrawer);

    const replay = $("[data-replay]", drawer);
    if (replay) {
      replay.addEventListener("click", () => {
        replay.disabled = true;
        replay.textContent = "Считаем...";
        const result = $("[data-replay-result]", drawer);
        window.setTimeout(() => {
          replay.textContent = "Готово";
          if (result) result.textContent = "0 переполнений · запас 18%";
        }, 600);
      });
    }

    const ask = $("[data-ask]", drawer);
    const input = $("[data-ask-input]", drawer);
    if (ask && input) {
      const submit = () => {
        const value = input.value.trim();
        if (!value) return;
        closeDrawer();
        $("#chatPanel")?.scrollIntoView({ behavior: "smooth", block: "center" });
        sendChat(value);
      };
      ask.addEventListener("click", submit);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submit();
      });
    }
  }

  // ---------- Report ----------

  function openReport() {
    const total = totalSavings();
    const risks = riskItems();
    const top = RESOURCES.filter((r) => r.savings > 0 && !r.risk).sort((a, b) => b.savings - a.savings).slice(0, 7);
    const date = new Date().toLocaleDateString("ru-RU");
    $("#reportBody").innerHTML = `
      <div class="chart-head"><span>Отчёт по парку · ${escapeHtml(DEMO_META.period)}</span><span>${escapeHtml(date)}</span></div>
      <h1 style="font-size:24px;margin-top:6px">Переплата и риск: что сделать</h1>
      <div class="report-hero">
        <div class="report-stat"><span>Счёт за месяц</span><b>${fmt(DEMO_META.bill)}</b></div>
        <div class="report-stat"><span>Находимая экономия</span><b style="color:#059669">${fmt(total)}</b></div>
        <div class="report-stat"><span>В зоне риска</span><b style="color:#dc2626">${risks.length} ${plural(risks.length, ["ресурс", "ресурса", "ресурсов"])}</b></div>
      </div>
      <div class="report-risk">
        <b>Не уменьшать</b>
        <ul>${risks.map((r) => `<li><b>${escapeHtml(r.name)}</b> — ${escapeHtml(r.reason)}. ${escapeHtml(r.detail)}</li>`).join("")}</ul>
      </div>
      <h2>Экономия по группам</h2>
      <table>
        <thead><tr><th>Группа</th><th class="num">Ресурсов</th><th class="num">₽/мес</th></tr></thead>
        <tbody>${CATEGORIES.map((c) => `<tr><td>${escapeHtml(c.title)}</td><td class="num">${c.id === "reserve" ? "~40% парка" : c.count}</td><td class="num">${fmt(categorySavings(c))}</td></tr>`).join("")}</tbody>
      </table>
      <h2>Топ рекомендаций</h2>
      <table>
        <thead><tr><th>Ресурс</th><th>Сейчас → нужно</th><th class="num">₽/мес</th></tr></thead>
        <tbody>${top.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.current)} → ${escapeHtml(r.proposed)}</td><td class="num">${fmt(r.savings)}</td></tr>`).join("")}</tbody>
      </table>
      <div class="report-foot">Демонстрационные данные, синтетический парк. Не является результатом внедрения у клиента. Числа считает код; LLM только формулирует.</div>`;
    $("#reportModal").hidden = false;
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
  }

  // ---------- Reset / scenario ----------

  function resetDemo() {
    state.group = null;
    state.type = "all";
    state.search = "";
    state.peak = 70;
    state.chat = [
      {
        role: "bot",
        text: "Здравствуйте. Спросите про любой ресурс — отвечу по данным парка. Например: «Почему billing-db-02 в зоне риска?»",
        tools: [],
      },
    ];
    state.typing = false;
    state.tokensUsed = loadTokens(state.account);
    $("#searchInput").value = "";
    $("#peakRange").value = "70";
    $("#peakValue").textContent = "70%";
    setActiveChip("all");
    renderAll();
    renderTokens();
    closeDrawer();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setActiveChip(type) {
    $$("#typeChips .chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.type === type);
    });
  }

  function renderAll() {
    renderSummary();
    renderCategories();
    renderRisk();
    renderResources();
    renderChat();
  }

  function showAccountGate() {
    const modal = $("#accountModal");
    if (!modal) return;
    modal.hidden = false;
    window.setTimeout(() => $("#accountEmail")?.focus(), 60);
  }

  function applyAccount(account) {
    state.account = normalizeAccount(account);
    state.tokensUsed = loadTokens(state.account);
    state.typing = false;
    state.chat = [
      {
        role: "bot",
        text: `Аккаунт ${state.account}. Бюджет демо — ${num(DEMO_META.tokenBudget)} токенов, ответ до 600. Спросите про любой ресурс.`,
        tools: [],
      },
    ];
    $("#tokenAccount").textContent = state.account;
    $("#accountModal").hidden = true;
    renderTokens();
    renderChat();
  }

  function switchAccount() {
    storageRemove(ACCOUNT_KEY);
    state.account = "";
    state.tokensUsed = 0;
    $("#tokenAccount").textContent = "—";
    $("#accountEmail").value = "";
    $("#accountCompany").value = "";
    showAccountGate();
    renderTokens();
  }

  // ---------- Init ----------

  function init() {
    $("#metaResources").textContent = DEMO_META.resources;
    $("#metaPeriod").textContent = DEMO_META.period;
    $("#metaStep").textContent = DEMO_META.step;
    $("#billValue").textContent = fmt(DEMO_META.bill);

    state.account = loadAccount();
    renderAll();
    renderTokens();
    if (state.account) applyAccount(state.account);

    $("#accountForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = normalizeAccount($("#accountEmail").value);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        $("#accountEmail").reportValidity();
        return;
      }
      storageSet(ACCOUNT_KEY, email);
      applyAccount(email);
    });

    $("#switchAccount")?.addEventListener("click", switchAccount);
    if (!state.account) showAccountGate();

    $("#searchInput").addEventListener("input", (event) => {
      state.search = event.target.value;
      renderResources();
    });

    $("#peakRange").addEventListener("input", (event) => {
      state.peak = Number(event.target.value);
      $("#peakValue").textContent = `${state.peak}%`;
      renderSummary();
      renderCategories();
      renderRisk();
      renderResources();
    });

    $("#typeChips").addEventListener("click", (event) => {
      const chip = event.target.closest(".chip");
      if (!chip) return;
      state.type = chip.dataset.type;
      setActiveChip(state.type);
      renderResources();
    });

    $("#clearFilter").addEventListener("click", () => {
      state.group = null;
      state.type = "all";
      state.search = "";
      $("#searchInput").value = "";
      setActiveChip("all");
      renderCategories();
      renderResources();
    });

    $("#resetBtn").addEventListener("click", resetDemo);
    $("#reportBtn").addEventListener("click", openReport);
    $("#navReport").addEventListener("click", openReport);
    $("#printReport").addEventListener("click", () => window.print());

    $("#scenarioBtn").addEventListener("click", () => {
      $("#scenarioModal").hidden = false;
    });
    $("#startScenario").addEventListener("click", () => {
      closeModal("scenarioModal");
      resetDemo();
    });

    $("#chatForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = $("#chatInput");
      const value = input.value;
      input.value = "";
      sendChat(value);
    });

    $("#chatSuggestions").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-question]");
      if (!chip) return;
      sendChat(chip.dataset.question);
    });

    $("#drawerBackdrop").addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDrawer();
        closeModal("reportModal");
        closeModal("scenarioModal");
      }
    });

    $$(".modal-backdrop").forEach((backdrop) => {
      if (backdrop.id === "accountModal") return;
      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) backdrop.hidden = true;
      });
    });

    $$("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.close));
    });

    // Chat suggestions
    const suggestions = [
      "Почему billing-db-02 в риске?",
      "Что будет с orders-api-04?",
      "Сколько можно сэкономить?",
    ];
    $("#chatSuggestions").innerHTML = suggestions
      .map((q) => `<button class="suggestion" type="button" data-question="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
      .join("");
  }

  init();
})();
