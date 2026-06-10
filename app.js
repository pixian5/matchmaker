const STORAGE_KEY = "mediapeople-dating-demo-v1";
const VIP_PRICE = 399;

const seedState = {
  currentUserId: "u1",
  selectedMatchmakerId: "m1",
  splits: {
    promo: 20,
    matchmaker: 35,
    platform: 45,
  },
  agencies: [
    { id: "a1", name: "优联婚恋传媒", city: "上海" },
    { id: "a2", name: "星河红娘社", city: "杭州" },
  ],
  matchmakers: [
    { id: "m1", agencyId: "a1", name: "李莉", code: "HM-LILI" },
    { id: "m2", agencyId: "a2", name: "娜娜", code: "HM-NANA" },
  ],
  users: [
    {
      id: "u1",
      name: "林安",
      gender: "男",
      age: 31,
      city: "上海",
      job: "内容策划",
      wechat: "linan_media",
      vip: false,
      referralMatchmakerId: null,
      bio: "喜欢纪录片、城市漫步和认真做饭，工作稳定，想找一个能一起成长的人。",
      requirements: "希望对方真诚、有稳定生活节奏，愿意沟通，也喜欢旅行或阅读。",
      photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "u2",
      name: "周晴",
      gender: "女",
      age: 29,
      city: "上海",
      job: "品牌经理",
      wechat: "qing_brand",
      vip: true,
      referralMatchmakerId: "m1",
      bio: "性格温和但有主见，喜欢展览、咖啡和羽毛球，期待长期关系。",
      requirements: "希望男生有责任心，情绪稳定，工作积极，年龄 28-35 岁。",
      photo:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "u3",
      name: "许知夏",
      gender: "女",
      age: 33,
      city: "杭州",
      job: "制片人",
      wechat: "xuzhixia_film",
      vip: false,
      referralMatchmakerId: null,
      bio: "常年做项目管理，喜欢高效也珍惜松弛，周末会去爬山。",
      requirements: "希望对方成熟坦诚，尊重彼此事业，有结婚计划。",
      photo:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: "u4",
      name: "陈亦舟",
      gender: "男",
      age: 35,
      city: "杭州",
      job: "摄影导演",
      wechat: "yizhou_photo",
      vip: true,
      referralMatchmakerId: "m2",
      bio: "工作在影像行业，生活里比较安静，喜欢骑行、做咖啡和看老电影。",
      requirements: "希望女生独立、善良，能接受偶尔出差，愿意认真经营关系。",
      photo:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
    },
  ],
  requests: [],
  deals: [{ id: "d1", requestId: null, amount: 399, createdAt: "2026-06-10" }],
};

let state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(seedState);
  }

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function currentUser() {
  return state.users.find((user) => user.id === state.currentUserId);
}

function getMatchmaker(id) {
  return state.matchmakers.find((matchmaker) => matchmaker.id === id);
}

function getAgency(id) {
  return state.agencies.find((agency) => agency.id === id);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function switchView(view) {
  $$(".nav-item").forEach((item) =>
    item.classList.toggle("active", item.dataset.view === view),
  );
  $$(".view").forEach((panel) => panel.classList.remove("active"));
  $(`#${view}View`).classList.add("active");

  const names = {
    mini: `客户：${currentUser().name}`,
    matchmaker: `红娘：${getMatchmaker(state.selectedMatchmakerId)?.name || "未选择"}`,
    admin: "管理员：平台运营",
  };
  $("#currentPersona").textContent = names[view];
}

function switchMiniTab(tab) {
  $$("[data-mini-tab]").forEach((item) =>
    item.classList.toggle("active", item.dataset.miniTab === tab),
  );
  $$(".mini-tab").forEach((panel) => panel.classList.remove("active"));
  $(`#${tab}Tab`).classList.add("active");
}

function renderFilters() {
  const cities = ["全部", ...new Set(state.users.map((user) => user.city))];
  $("#cityFilter").innerHTML = cities
    .map((city) => `<option value="${city}">${city}</option>`)
    .join("");
}

function renderMiniApp() {
  const user = currentUser();
  $("#vipState").textContent = user.vip ? "VIP 会员" : "普通用户";
  $("#vipState").style.background = user.vip ? "#d9f7e8" : "#fff1c7";
  $("#vipState").style.color = user.vip ? "#166534" : "#7a4a08";
  renderProfileForm();
  renderProfiles();
  renderRequests();
}

function renderProfileForm() {
  const form = $("#profileForm");
  const user = currentUser();
  Object.entries(user).forEach(([key, value]) => {
    if (form.elements[key]) {
      form.elements[key].value = value;
    }
  });
}

function matchesAge(age, range) {
  if (range === "all") return true;
  const [min, max] = range.split("-").map(Number);
  return age >= min && age <= max;
}

function renderProfiles() {
  const user = currentUser();
  const gender = $("#genderFilter").value;
  const city = $("#cityFilter").value || "全部";
  const ageRange = $("#ageFilter").value;
  const profiles = state.users.filter(
    (item) =>
      item.id !== user.id &&
      item.gender === gender &&
      (city === "全部" || item.city === city) &&
      matchesAge(item.age, ageRange),
  );

  $("#profileList").innerHTML =
    profiles
      .map((profile) => {
        const requirement = user.vip
          ? profile.requirements
          : "开通会员后可查看对方的择偶要求";
        const lockedClass = user.vip ? "" : " locked";
        return `
          <article class="profile-card">
            <div class="profile-photo" style="background-image:url('${profile.photo}')"></div>
            <div class="profile-body">
              <div class="profile-head">
                <strong>${profile.name}</strong>
                <span class="profile-meta">${profile.age} 岁 · ${profile.city}</span>
              </div>
              <div class="profile-meta">${profile.gender} · ${profile.job}</div>
              <p>${profile.bio}</p>
              <div class="requirement-box${lockedClass}">${requirement}</div>
              <button class="primary-button" data-connect="${profile.id}" type="button">申请牵线</button>
            </div>
          </article>
        `;
      })
      .join("") || `<div class="request-card muted">暂无符合筛选条件的资料。</div>`;
}

function createRequest(targetUserId) {
  const user = currentUser();
  const target = state.users.find((item) => item.id === targetUserId);
  if (!user.vip) {
    showToast("请先扫码开通会员，再提交牵线请求");
    switchMiniTab("vip");
    return;
  }

  const exists = state.requests.some(
    (request) =>
      request.fromUserId === user.id &&
      request.toUserId === targetUserId &&
      request.status !== "已完成",
  );
  if (exists) {
    showToast("这条牵线请求已经在处理中");
    return;
  }

  const matchmakerId =
    user.referralMatchmakerId || target.referralMatchmakerId || state.matchmakers[0]?.id;
  state.requests.unshift({
    id: uid("r"),
    fromUserId: user.id,
    toUserId: targetUserId,
    matchmakerId,
    status: "待红娘联系",
    createdAt: new Date().toISOString(),
  });
  saveState();
  renderAll();
  showToast(`已通知红娘为你和${target.name}牵线`);
}

function renderRequests() {
  const user = currentUser();
  const requests = state.requests.filter(
    (request) => request.fromUserId === user.id || request.toUserId === user.id,
  );
  $("#requestCount").textContent = `${requests.length} 条`;
  $("#myRequests").innerHTML =
    requests
      .map((request) => {
        const from = state.users.find((item) => item.id === request.fromUserId);
        const to = state.users.find((item) => item.id === request.toUserId);
        const matchmaker = getMatchmaker(request.matchmakerId);
        return `
          <article class="request-card">
            <span class="status-pill">${request.status}</span>
            <strong>${from.name} 与 ${to.name}</strong>
            <div class="muted">负责红娘：${matchmaker?.name || "待分配"}</div>
          </article>
        `;
      })
      .join("") || `<div class="request-card muted">还没有牵线请求。</div>`;
}

function becomeVip() {
  const code = $("#referralCodeInput").value.trim();
  const matchmaker = state.matchmakers.find(
    (item) => item.code.toUpperCase() === code.toUpperCase(),
  );
  if (!matchmaker) {
    showToast("推荐码无效，请输入后台已登记的红娘推荐码");
    return;
  }

  const user = currentUser();
  user.vip = true;
  user.referralMatchmakerId = matchmaker.id;
  state.deals.unshift({
    id: uid("d"),
    requestId: null,
    amount: VIP_PRICE,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  saveState();
  renderAll();
  showToast(`已开通 VIP，推广红娘为${matchmaker.name}`);
}

function renderMatchmakerDesk() {
  $("#matchmakerSelect").innerHTML = state.matchmakers
    .map(
      (item) =>
        `<option value="${item.id}" ${item.id === state.selectedMatchmakerId ? "selected" : ""}>${item.name} · ${item.code}</option>`,
    )
    .join("");

  const requests = state.requests.filter(
    (request) => request.matchmakerId === state.selectedMatchmakerId,
  );
  $("#notificationCount").textContent = `${requests.filter((item) => item.status === "待红娘联系").length} 条待处理`;
  $("#notificationList").innerHTML =
    requests
      .map((request) => {
        const from = state.users.find((item) => item.id === request.fromUserId);
        const to = state.users.find((item) => item.id === request.toUserId);
        return `
          <article class="request-card">
            <span class="status-pill">${request.status}</span>
            <strong>${from.name} 申请认识 ${to.name}</strong>
            <div class="muted">${new Date(request.createdAt).toLocaleString("zh-CN")}</div>
            <button class="secondary-button" data-accept="${request.id}" type="button">标记已联系双方</button>
          </article>
        `;
      })
      .join("") || `<div class="request-card muted">暂无应用通知。</div>`;

  $("#contactPanel").innerHTML =
    requests
      .map((request) => {
        const from = state.users.find((item) => item.id === request.fromUserId);
        const to = state.users.find((item) => item.id === request.toUserId);
        return `
          <article class="contact-card">
            <strong>${from.name} 与 ${to.name}</strong>
            <p class="muted">${from.name} 微信：${from.wechat}</p>
            <p class="muted">${to.name} 微信：${to.wechat}</p>
          </article>
        `;
      })
      .join("") || `<div class="contact-card muted">接到牵线请求后会显示双方微信。</div>`;
}

function completeRequest(requestId) {
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) return;
  request.status = "已联系双方";
  saveState();
  renderAll();
  showToast("已标记红娘联系进度");
}

function renderAdmin() {
  renderMetrics();
  renderSplit();
  renderAgencies();
  renderMatchmakers();
  renderCustomers();
  renderChart();
}

function renderMetrics() {
  const vipCount = state.users.filter((user) => user.vip).length;
  const totalAmount = state.deals.reduce((sum, deal) => sum + deal.amount, 0);
  const cards = [
    ["客户数量", state.users.length],
    ["VIP 数量", vipCount],
    ["成交数量", state.deals.length],
    ["总金额", `¥${totalAmount}`],
  ];
  $("#metricsGrid").innerHTML = cards
    .map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderSplit() {
  const form = $("#splitForm");
  form.elements.promo.value = state.splits.promo;
  form.elements.matchmaker.value = state.splits.matchmaker;
  form.elements.platform.value = state.splits.platform;
  const labels = [
    ["介绍推广费", "promo", "#dc6b5c"],
    ["红娘牵线费", "matchmaker", "#0f766e"],
    ["平台服务费", "platform", "#3867d6"],
  ];
  $("#splitPreview").innerHTML = labels
    .map(
      ([label, key, color]) => `
        <div class="split-row">
          <span>${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${state.splits[key]}%;background:${color}"></div></div>
          <strong>${state.splits[key]}%</strong>
        </div>
      `,
    )
    .join("");
}

function renderAgencies() {
  $("#agencyCount").textContent = `${state.agencies.length} 家`;
  $("#agencyList").innerHTML = state.agencies
    .map(
      (agency) => `
        <div class="plain-item">
          <strong>${agency.name}</strong>
          <span class="muted">${agency.city}</span>
        </div>
      `,
    )
    .join("");

  const select = $("#matchmakerForm select[name='agencyId']");
  select.innerHTML = state.agencies
    .map((agency) => `<option value="${agency.id}">${agency.name}</option>`)
    .join("");
}

function renderMatchmakers() {
  $("#matchmakerCount").textContent = `${state.matchmakers.length} 位`;
  $("#matchmakerList").innerHTML = state.matchmakers
    .map((matchmaker) => {
      const agency = getAgency(matchmaker.agencyId);
      return `
        <div class="plain-item">
          <strong>${matchmaker.name}</strong>
          <span class="muted">${agency?.name || "未分配"} · ${matchmaker.code}</span>
        </div>
      `;
    })
    .join("");
}

function renderCustomers() {
  $("#customerCount").textContent = `${state.users.length} 位`;
  $("#customerRows").innerHTML = state.users
    .map((user) => {
      const matchmaker = getMatchmaker(user.referralMatchmakerId);
      return `
        <tr>
          <td>${user.name} · ${user.gender} · ${user.age}</td>
          <td>${user.city}</td>
          <td>${user.vip ? "VIP" : "普通"}</td>
          <td>${matchmaker?.name || "-"}</td>
          <td>${user.wechat}</td>
        </tr>
      `;
    })
    .join("");
}

function renderChart() {
  const totalAmount = state.deals.reduce((sum, deal) => sum + deal.amount, 0);
  const max = Math.max(state.users.length, state.requests.length, state.deals.length, totalAmount / 100, 1);
  const rows = [
    ["客户", state.users.length, state.users.length],
    ["牵线", state.requests.length, state.requests.length],
    ["成交", state.deals.length, state.deals.length],
    ["金额", totalAmount / 100, `¥${totalAmount}`],
  ];
  $("#chartPanel").innerHTML = rows
    .map(
      ([label, value, display]) => `
        <div class="bar-row">
          <span>${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max((value / max) * 100, 4)}%"></div></div>
          <strong>${display}</strong>
        </div>
      `,
    )
    .join("");
}

function addAgency(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.agencies.push({
    id: uid("a"),
    name: form.elements.name.value.trim(),
    city: form.elements.city.value.trim(),
  });
  form.reset();
  saveState();
  renderAll();
  showToast("机构已添加");
}

function addMatchmaker(event) {
  event.preventDefault();
  const form = event.currentTarget;
  state.matchmakers.push({
    id: uid("m"),
    name: form.elements.name.value.trim(),
    agencyId: form.elements.agencyId.value,
    code: form.elements.code.value.trim().toUpperCase(),
  });
  form.reset();
  saveState();
  renderAll();
  showToast("红娘已添加");
}

function saveSplits(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const next = {
    promo: Number(form.elements.promo.value),
    matchmaker: Number(form.elements.matchmaker.value),
    platform: Number(form.elements.platform.value),
  };
  const total = next.promo + next.matchmaker + next.platform;
  if (total !== 100) {
    showToast(`当前合计为 ${total}%，请调整为 100%`);
    return;
  }
  state.splits = next;
  saveState();
  renderAll();
  showToast("分成比例已保存");
}

function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const user = currentUser();
  ["name", "gender", "city", "job", "wechat", "bio", "requirements"].forEach((key) => {
    user[key] = form.elements[key].value.trim();
  });
  user.age = Number(form.elements.age.value);
  saveState();
  renderAll();
  showToast("个人资料已保存");
}

function seedDeal() {
  state.deals.unshift({
    id: uid("d"),
    requestId: state.requests[0]?.id || null,
    amount: VIP_PRICE,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  saveState();
  renderAll();
  showToast("已模拟新增一笔成交");
}

function renderAll() {
  renderFilters();
  renderMiniApp();
  renderMatchmakerDesk();
  renderAdmin();
}

function bindEvents() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  $$("[data-mini-tab]").forEach((button) => {
    button.addEventListener("click", () => switchMiniTab(button.dataset.miniTab));
  });
  ["#genderFilter", "#cityFilter", "#ageFilter"].forEach((selector) => {
    $(selector).addEventListener("change", renderProfiles);
  });
  $("#profileList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-connect]");
    if (button) createRequest(button.dataset.connect);
  });
  $("#notificationList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-accept]");
    if (button) completeRequest(button.dataset.accept);
  });
  $("#becomeVipBtn").addEventListener("click", becomeVip);
  $("#profileForm").addEventListener("submit", saveProfile);
  $("#matchmakerSelect").addEventListener("change", (event) => {
    state.selectedMatchmakerId = event.target.value;
    saveState();
    renderAll();
  });
  $("#splitForm").addEventListener("submit", saveSplits);
  $("#agencyForm").addEventListener("submit", addAgency);
  $("#matchmakerForm").addEventListener("submit", addMatchmaker);
  $("#seedDealBtn").addEventListener("click", seedDeal);
  $("#resetDataBtn").addEventListener("click", () => {
    state = structuredClone(seedState);
    saveState();
    renderAll();
    showToast("演示数据已重置");
  });
}

bindEvents();
renderAll();
