/* Демо-данные: синтетический парк «Облачный ревизор».
   Числа согласованы с dataset-blueprint.md и demo-script.md. */

const DEMO_META = {
  resources: 225,
  vms: 60,
  disks: 23,
  snapshots: 140,
  other: 2,
  bill: 1240000,
  savings: 340000,
  period: "октябрь 2026",
  step: "60 с",
};

const CATEGORIES = [
  { id: "oversized", title: "Завышен размер", savings: 50000, count: 12, unit: "ресурсов", tone: "blue", icon: "↓" },
  { id: "idle", title: "Простой", savings: 62000, count: 9, unit: "ресурсов", tone: "amber", icon: "◷" },
  { id: "schedule", title: "Расписание", savings: 58000, count: 14, unit: "ресурсов", tone: "violet", icon: "≡" },
  { id: "consolidation", title: "Объединение", savings: 46000, count: 8, unit: "пар", tone: "green", icon: "⇄" },
  { id: "needles", title: "Иглы", savings: 24000, count: 5, unit: "ресурсов", tone: "orange", icon: "⚡" },
  { id: "disks", title: "Диски без владельца", savings: 41000, count: 23, unit: "диска", tone: "slate", icon: "◌" },
  { id: "snapshots", title: "Старые снапшоты", savings: 12000, count: 140, unit: "снапшотов", tone: "gray", icon: "▣" },
  { id: "reserve", title: "Резерв вместо on-demand", savings: 47000, count: 0, unit: "~40% парка", tone: "mint", icon: "◎" },
];

const RESOURCES = [];

function addVM(name, role, group, current, proposed, savings, opts = {}) {
  RESOURCES.push({
    id: name,
    name,
    type: "ВМ",
    role,
    group,
    current,
    proposed,
    savings,
    owner: opts.owner || "Платформа",
    p995: opts.p995 || 18,
    ram: opts.ram || 52,
    risk: !!opts.risk,
    note: opts.note || "",
  });
}

// Завышен размер — 12, сумма 50 000
addVM("orders-api-04", "api", "oversized", "8 vCPU / 32 ГБ", "4 vCPU / 24 ГБ", 16300, { p995: 20, ram: 58, owner: "Команда заказов" });
addVM("catalog-api-02", "api", "oversized", "8 vCPU / 32 ГБ", "4 vCPU / 16 ГБ", 3900, { p995: 18, ram: 54, owner: "Команда каталога" });
addVM("search-api-03", "api", "oversized", "8 vCPU / 32 ГБ", "4 vCPU / 16 ГБ", 3800, { p995: 17, ram: 52, owner: "Поиск" });
addVM("auth-api-01", "api", "oversized", "4 vCPU / 16 ГБ", "2 vCPU / 8 ГБ", 2500, { p995: 15, ram: 48, owner: "Платформа" });
addVM("cart-api-02", "api", "oversized", "4 vCPU / 16 ГБ", "2 vCPU / 8 ГБ", 2400, { p995: 16, ram: 50, owner: "Команда заказов" });
addVM("payments-api-03", "api", "oversized", "8 vCPU / 32 ГБ", "4 vCPU / 16 ГБ", 3800, { p995: 19, ram: 56, owner: "Платежи" });
addVM("inventory-api-02", "api", "oversized", "4 vCPU / 16 ГБ", "2 vCPU / 8 ГБ", 2300, { p995: 14, ram: 47, owner: "Склад" });
addVM("notify-worker-02", "worker", "oversized", "4 vCPU / 16 ГБ", "2 vCPU / 8 ГБ", 2200, { p995: 12, ram: 45, owner: "Уведомления" });
addVM("email-worker-01", "worker", "oversized", "4 vCPU / 16 ГБ", "2 vCPU / 8 ГБ", 2100, { p995: 11, ram: 44, owner: "Уведомления" });
addVM("etl-worker-03", "batch", "oversized", "8 vCPU / 32 ГБ", "4 vCPU / 16 ГБ", 3700, { p995: 18, ram: 55, owner: "Данные" });
addVM("ml-inference-02", "ml", "oversized", "8 vCPU / 32 ГБ", "4 vCPU / 24 ГБ", 4300, { p995: 20, ram: 60, owner: "ML" });
addVM("media-api-01", "api", "oversized", "4 vCPU / 16 ГБ", "2 vCPU / 8 ГБ", 2700, { p995: 15, ram: 49, owner: "Медиа" });

// Простой — 9, сумма 62 000
const IDLE = [
  ["legacy-crm-01", 7000],
  ["test-stand-02", 6500],
  ["old-billing-01", 7200],
  ["staging-api-03", 6800],
  ["demo-env-01", 6600],
  ["backup-proxy-02", 7100],
  ["temp-etl-01", 6900],
  ["qa-runner-03", 7000],
  ["sandbox-db-01", 6900],
];
IDLE.forEach(([name, savings]) => addVM(name, "legacy", "idle", "4 vCPU / 16 ГБ", "Остановить", savings, { p995: 2, ram: 18, note: "P95 CPU < 3%, запросов нет" }));

// Расписание — 14, сумма 58 000
const SCHEDULE = [
  "office-proxy-01", "reports-portal-01", "hr-portal-01", "finance-ui-01",
  "support-desk-01", "docs-portal-01", "admin-panel-01",
  "night-etl-01", "night-etl-02", "billing-batch-01", "billing-batch-02",
  "archive-worker-01", "cleanup-worker-01", "indexer-night-01",
];
SCHEDULE.forEach((name, i) => {
  const savings = i < 12 ? 4143 : 4142;
  addVM(name, "service", "schedule", "4 vCPU / 16 ГБ", "По расписанию", savings, { p995: 9, ram: 36, note: "Половина суток ниже 10%" });
});

// Объединение — 8 пар, сумма 46 000
const PAIRS = [
  ["api-day-01", "api-night-01"],
  ["worker-day-01", "worker-night-01"],
  ["batch-am-01", "batch-pm-01"],
  ["front-day-01", "front-night-01"],
  ["queue-am-01", "queue-pm-01"],
  ["report-day-01", "report-night-01"],
  ["sync-am-01", "sync-pm-01"],
  ["cache-day-01", "cache-night-01"],
];
PAIRS.forEach(([a, b]) => {
  const name = `${a} + ${b}`;
  RESOURCES.push({
    id: a,
    name,
    type: "Пара",
    role: "pair",
    group: "consolidation",
    current: "2 × 4 vCPU / 16 ГБ",
    proposed: "1 × 8 vCPU / 32 ГБ",
    savings: 5750,
    owner: "Платформа",
    p995: 14,
    ram: 48,
    risk: false,
    note: "Не работают одновременно, overlap < 0.3",
  });
});

// Иглы — 5, сумма 24 000
["report-worker-01", "report-worker-02", "export-worker-01", "sync-worker-01", "pdf-worker-01"].forEach((name) => {
  addVM(name, "worker", "needles", "4 vCPU / 16 ГБ", "Burstable 2 vCPU", 4800, { p995: 8, ram: 34, note: "Пики 60–75% по 5–10 минут" });
});

// Диски — 23, сумма 41 000
const DISKS = [];
for (let i = 1; i <= 5; i++) DISKS.push(`disk-orders-0${i}`);
for (let i = 1; i <= 4; i++) DISKS.push(`disk-billing-0${i}`);
for (let i = 1; i <= 6; i++) DISKS.push(`disk-data-0${i}`);
for (let i = 1; i <= 8; i++) DISKS.push(`disk-legacy-0${i}`);
DISKS.forEach((name, i) => {
  RESOURCES.push({
    id: name,
    name,
    type: "Диск",
    role: "disk",
    group: "disks",
    current: "500 ГБ, detached",
    proposed: "Отключить",
    savings: i === DISKS.length - 1 ? 1774 : 1783,
    owner: "Нет владельца",
    p995: 0,
    ram: 0,
    risk: false,
    note: "Отключён больше 90 дней",
  });
});

// Снапшоты — агрегированная строка, 140 шт., 12 000
RESOURCES.push({
  id: "snapshots",
  name: "140 снапшотов",
  type: "Снапшот",
  role: "snapshot",
  group: "snapshots",
  current: "91–400 дней",
  proposed: "Удалить старые",
  savings: 12000,
  owner: "—",
  p995: 0,
  ram: 0,
  risk: false,
  note: "Свежие снапшоты не трогаем",
  count: 140,
});

// Риск — 3 базовых + 2, появляются при росте целевого пика
const RISK = [
  {
    id: "billing-db-02", name: "billing-db-02", role: "db", minPeak: 60,
    reason: "IOPS 79% при норме 68%", detail: "CPU 18%, RAM 88% — это кэш. Уменьшать нельзя: нужен диск быстрее.",
    metrics: [["CPU", "18%"], ["RAM", "88%"], ["IOPS", "79%"], ["Норма IOPS", "68%"]],
  },
  {
    id: "vm-risk-01", name: "vm-risk-01", role: "api", minPeak: 65,
    reason: "Пик 90%", detail: "Запас меньше 1,2×. Ошибка прогноза 10–15% уже больше запаса.",
    metrics: [["Пик", "90%"], ["Запас", "< 1,2×"], ["Ошибка", "10–15%"]],
  },
  {
    id: "vm-risk-02", name: "vm-risk-02", role: "api", minPeak: 70,
    reason: "Пик 88%", detail: "На грани отказа. Любое уменьшение упрётся в пик.",
    metrics: [["Пик", "88%"], ["Запас", "< 1,2×"], ["Ошибка", "10–15%"]],
  },
  {
    id: "vm-risk-03", name: "vm-risk-03", role: "worker", minPeak: 75,
    reason: "Пик 86%", detail: "Появляется при целевом пике 75%: запас съедает ошибка прогноза.",
    metrics: [["Пик", "86%"], ["Запас", "< 1,15×"]],
  },
  {
    id: "vm-risk-04", name: "vm-risk-04", role: "api", minPeak: 80,
    reason: "Пик 84%", detail: "Появляется при целевом пике 80%: уменьшать нельзя.",
    metrics: [["Пик", "84%"], ["Запас", "< 1,1×"]],
  },
];
RISK.slice(0, 3).forEach((r) => {
  addVM(r.name, r.role, "risk", "8 vCPU / 32 ГБ", "Не уменьшать", 0, { risk: true, p995: 90, ram: 88, note: r.reason });
});

// Норма и прочее — без рекомендаций
addVM("cron-report-01", "cron", "norm", "4 vCPU / 16 ГБ", "Оставить", 0, { p995: 14, ram: 32, note: "Пик 14% только в 02:00, запросов нет" });
RESOURCES.push({ id: "lb-orders-01", name: "lb-orders-01", type: "Прочее", role: "lb", group: "other", current: "LB", proposed: "Без рекомендаций", savings: 0, owner: "Платформа", p995: 0, ram: 0, risk: false, note: "" });
RESOURCES.push({ id: "k8s-node-01", name: "k8s-node-01", type: "Прочее", role: "k8s", group: "other", current: "K8s node", proposed: "Без рекомендаций", savings: 0, owner: "Платформа", p995: 0, ram: 0, risk: false, note: "" });

// Резерв — не отдельный ресурс, а смена тарифа на ~40% парка
RESOURCES.push({
  id: "reserve",
  name: "Резерв вместо on-demand",
  type: "Тариф",
  role: "reserve",
  group: "reserve",
  current: "On-demand",
  proposed: "Резерв на 1 год",
  savings: 47000,
  owner: "~40% парка",
  p995: 0,
  ram: 0,
  risk: false,
  note: "Стабильная нагрузка 3 месяца ±5%: резерв дешевле on-demand",
});

const CHAT_ANSWERS = [
  {
    match: /billing-db-02/i,
    text: "CPU 18%, RAM 88% — это кэш. Но IOPS 79% при норме 68%: диск на грани. Уменьшать нельзя — сначала нужен диск быстрее.",
    tools: ["get_resource", "get_metrics", "get_recommendation"],
  },
  {
    match: /orders-api-04/i,
    text: "На 4 vCPU / 24 ГБ: 0 переполнений, запас 18%, экономия 16 300 ₽/мес. P99.5 20%, целевой пик 70%.",
    tools: ["get_resource", "get_metrics", "replay"],
  },
  {
    match: /сколько|эконом/i,
    text: "340 000 ₽/мес — 27% счёта. 8 групп, 225 ресурсов. Три ресурса в риске не входят в экономию.",
    tools: ["get_summary"],
  },
  {
    match: /риск/i,
    text: "В риске 3 ресурса: billing-db-02, vm-risk-01, vm-risk-02. У всех пик выше 85% или IOPS на грани.",
    tools: ["get_risk"],
  },
  {
    match: /резерв|reserved/i,
    text: "Резерв вместо on-demand даёт 47 000 ₽/мес на ~40% парка. Это не уменьшение ресурсов, а смена тарифа.",
    tools: ["get_recommendation"],
  },
];
