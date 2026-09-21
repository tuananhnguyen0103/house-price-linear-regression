"use strict";

const SQFT_PER_SQM = 10.7639104;

const QUALITY = [
  [10, "10 – Rất xuất sắc"], [9, "9 – Xuất sắc"], [8, "8 – Rất tốt"], [7, "7 – Tốt"], [6, "6 – Khá tốt"],
  [5, "5 – Trung bình"], [4, "4 – Dưới trung bình"], [3, "3 – Tạm được"], [2, "2 – Kém"], [1, "1 – Rất kém"],
];

// Thứ tự hiển thị và nhãn giao diện; số liệu mô hình lấy từ model.json.
const FIELDS = [
  { key: "OverallQual", label: "Chất lượng tổng thể", hint: "Vật liệu xây dựng và mức độ hoàn thiện.", options: QUALITY },
  { key: "YearBuilt", label: "Năm xây dựng", unitLabel: "" },
  { key: "GrLivArea", label: "Diện tích sử dụng", unitLabel: "m²", hint: "Tổng diện tích sàn trên mặt đất, không tính tầng hầm." },
  { key: "TotalBsmtSF", label: "Diện tích tầng hầm", unitLabel: "m²", hint: "Nhập 0 nếu không có tầng hầm." },
  { key: "LotArea", label: "Diện tích lô đất", unitLabel: "m²" },
  { key: "GarageCars", label: "Sức chứa ga-ra", unitLabel: "ô tô", hint: "Nhập 0 nếu không có ga-ra." },
  { key: "TotBath", label: "Tổng số phòng tắm", step: 0.5, hint: "Phòng chỉ có bồn rửa và toilet tính 0,5; gồm cả tầng hầm." },
  { key: "Fireplaces", label: "Số lò sưởi" },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const money = (v) => usd.format(v);
const signedMoney = (v) => (v < 0 ? "−" : "+") + usd.format(Math.abs(v));

const $ = (id) => document.getElementById(id);
const toDisplay = (f, v) => (f.unit === "sqft" ? v / SQFT_PER_SQM : v);
const toModel = (f, x) => (f.unit === "sqft" ? x * SQFT_PER_SQM : x);

let model;
const inputs = {};

function buildForm() {
  const host = $("fields");
  for (const spec of FIELDS) {
    const f = model.features.find((m) => m.key === spec.key);
    const min = Math.round(toDisplay(f, f.min));
    const max = Math.round(toDisplay(f, f.max));
    const step = spec.step || 1;
    const def = Math.round(toDisplay(f, f.median) / step) * step;

    const wrap = document.createElement("div");
    wrap.className = "field";

    const label = document.createElement("label");
    label.htmlFor = "f-" + spec.key;
    label.textContent = spec.label;
    wrap.appendChild(label);

    const control = document.createElement("div");
    control.className = "control";
    let el;
    if (spec.options) {
      el = document.createElement("select");
      for (const [value, text] of spec.options) el.add(new Option(text, value));
    } else {
      el = document.createElement("input");
      el.type = "number";
      el.inputMode = "decimal";
      el.step = spec.step || 1;
    }
    el.id = "f-" + spec.key;
    el.value = def;
    el.addEventListener("input", calculate);
    control.appendChild(el);
    if (spec.unitLabel) {
      const u = document.createElement("span");
      u.className = "unit";
      u.textContent = spec.unitLabel;
      control.appendChild(u);
    }
    wrap.appendChild(control);

    const hint = document.createElement("p");
    hint.className = "hint";
    const range = spec.options ? "" : `Khoảng dữ liệu: ${num.format(min)}–${num.format(max)}${spec.unitLabel ? " " + spec.unitLabel : ""}.`;
    hint.textContent = [spec.hint, range].filter(Boolean).join(" ");
    if (hint.textContent) wrap.appendChild(hint);

    host.appendChild(wrap);
    inputs[spec.key] = { el, spec, f, def };
  }
}

function readValues() {
  const values = {};
  const missing = [];
  const outside = [];
  for (const { el, spec, f } of Object.values(inputs)) {
    const x = spec.options ? Number(el.value) : el.valueAsNumber;
    el.removeAttribute("aria-invalid");
    if (!Number.isFinite(x)) {
      missing.push(spec.label);
      el.setAttribute("aria-invalid", "true");
      continue;
    }
    const tol = f.unit === "sqft" ? 0.5 : 0;
    if (x < toDisplay(f, f.min) - tol || x > toDisplay(f, f.max) + tol) {
      outside.push(spec.label);
      el.setAttribute("aria-invalid", "true");
    }
    values[spec.key] = toModel(f, x);
  }
  return { values, missing, outside };
}

function setNotice(text) {
  const n = $("notice");
  n.hidden = !text;
  n.textContent = text || "";
}

function calculate() {
  const { values, missing, outside } = readValues();
  const body = $("breakdown-body");
  body.replaceChildren();

  if (missing.length) {
    $("price").textContent = "—";
    $("range").textContent = "";
    setNotice("Vui lòng nhập đủ thông tin: " + missing.join(", ") + ".");
    return;
  }

  let price = model.intercept;
  const rows = [["Hệ số chặn (intercept)", "", model.intercept]];
  for (const spec of FIELDS) {
    const { f } = inputs[spec.key];
    const contribution = f.coef * values[spec.key];
    price += contribution;
    const shown = toDisplay(f, values[spec.key]);
    rows.push([spec.label, num.format(shown) + (spec.unitLabel ? " " + spec.unitLabel : ""), contribution]);
  }
  for (const [name, value, amount] of rows) {
    const tr = document.createElement("tr");
    for (const [text, cls] of [[name], [value, "num"], [signedMoney(amount), "num"]]) {
      const td = document.createElement("td");
      td.textContent = text;
      if (cls) td.className = cls;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  const total = document.createElement("tr");
  total.className = "total";
  for (const [text, cls] of [["Tổng = giá ước tính"], [""], [money(price), "num"]]) {
    const td = document.createElement("td");
    td.textContent = text;
    if (cls) td.className = cls;
    total.appendChild(td);
  }
  body.appendChild(total);

  const notes = [];
  if (outside.length) {
    notes.push("Giá trị của " + outside.join(", ") + " nằm ngoài khoảng dữ liệu huấn luyện, kết quả kém tin cậy.");
  }
  if (price <= 0) {
    $("price").textContent = "—";
    $("range").textContent = "";
    notes.push("Với tổ hợp thông tin này, mô hình tuyến tính cho kết quả không hợp lệ (≤ 0).");
  } else {
    const mae = model.metrics.mae_test;
    $("price").textContent = money(price);
    $("range").textContent = `Khoảng tham khảo: ${money(Math.max(0, price - mae))} – ${money(price + mae)}`;
  }
  setNotice(notes.join(" "));
}

function resetDefaults() {
  for (const { el, def } of Object.values(inputs)) el.value = def;
  calculate();
}

function showModelInfo() {
  const m = model.metrics;
  $("model-info").textContent =
    `Mô hình: Linear Regression (scikit-learn ${model.scikit_learn}) · R² = ${m.r2_test.toLocaleString("vi-VN")} · ` +
    `sai số tuyệt đối trung bình (MAE) ≈ ${money(m.mae_test)} trên ${m.n_test} căn kiểm tra · ` +
    `dữ liệu: ${model.dataset.name}, ${model.dataset.rows_used.toLocaleString("vi-VN")} căn.`;
}

async function init() {
  try {
    const res = await fetch("model.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    model = await res.json();
  } catch (err) {
    $("price").textContent = "Lỗi";
    setNotice("Không tải được model.json (" + err.message + "). Nếu mở file trực tiếp, hãy chạy bằng máy chủ web, ví dụ: python -m http.server");
    return;
  }
  buildForm();
  $("reset").addEventListener("click", resetDefaults);
  showModelInfo();
  calculate();
}

init();
