#!/usr/bin/env node
/**
 * Full online business regression audit.
 *
 * This script hits the deployed HTTPS APIs and creates disposable test data:
 * agency, matchmaker, promo code, users, match request, threads and messages.
 *
 * Usage:
 *   node scripts/full-business-audit.mjs
 *
 * Optional env:
 *   CLIENT_API=https://uk.sbbz.tech:21314/api
 *   MATCHMAKER_API=https://uk.sbbz.tech:21314/api
 *   ADMIN_API=https://uk.sbbz.tech:21314/api
 *   ADMIN_PASSWORD=admin
 */

const BASE_CLIENT = process.env.CLIENT_API || "https://uk.sbbz.tech:21314/api";
const BASE_MM = process.env.MATCHMAKER_API || "https://uk.sbbz.tech:21314/api";
const BASE_ADMIN = process.env.ADMIN_API || "https://uk.sbbz.tech:21314/api";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ts = Date.now();
const results = [];
const ids = {};

function ok(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log("OK", name, detail);
}

function fail(name, error) {
  results.push({ ok: false, name, error: String(error?.message || error) });
  console.error("FAIL", name, error);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function req(base, path, { method = "GET", token, body, expected } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (expected && !expected.includes(response.status)) {
    throw new Error(`${method} ${path} expected ${expected}, got ${response.status}: ${text}`);
  }
  if (!expected && !response.ok) {
    throw new Error(`${method} ${path} failed ${response.status}: ${text}`);
  }
  return { status: response.status, data };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    ok(name, detail || "");
  } catch (error) {
    fail(name, error);
  }
}

let adminToken;
let mmToken;
let maleToken;

await step("health all roles", async () => {
  for (const base of [BASE_CLIENT, BASE_MM, BASE_ADMIN]) {
    const { data } = await req(base, "/health");
    assert(data.ok === true, "health not ok");
  }
});

await step("admin login", async () => {
  const { data } = await req(BASE_ADMIN, "/auth/admin/login", {
    method: "POST",
    body: { password: ADMIN_PASSWORD },
  });
  adminToken = data.token;
  assert(adminToken, "missing admin token");
});

await step("admin agency/matchmaker/promo/split/deal", async () => {
  const agency = await req(BASE_ADMIN, "/admin/agencies", {
    method: "POST",
    token: adminToken,
    body: { name: `审计机构${ts}`, city: "上海" },
  });
  ids.agencyId = agency.data.agency.id;
  const code = `AUDIT${String(ts).slice(-8)}`;
  const matchmaker = await req(BASE_ADMIN, "/admin/matchmakers", {
    method: "POST",
    token: adminToken,
    body: { name: `审计红娘${ts}`, agencyId: ids.agencyId, code },
  });
  ids.matchmakerId = matchmaker.data.matchmaker.id;
  const invalidSplit = await req(BASE_ADMIN, "/admin/splits", {
    method: "PATCH",
    token: adminToken,
    body: { promo: 10, matchmaker: 10, platform: 10 },
    expected: [400],
  });
  assert(invalidSplit.status === 400, "invalid split should reject");
  const promo = await req(BASE_ADMIN, "/admin/promo-codes", {
    method: "POST",
    token: adminToken,
    body: { code: `PC${String(ts).slice(-8)}`, matchmakerId: "m1" },
  });
  ids.promoCode = promo.data.promoCode.code;
  const deal = await req(BASE_ADMIN, "/admin/deals/simulate", {
    method: "POST",
    token: adminToken,
  });
  assert(deal.data.deal.amount === 399, "deal amount mismatch");
});

await step("client registration/profile/review", async () => {
  const male = await req(BASE_CLIENT, "/auth/client/register", {
    method: "POST",
    body: {
      name: `审计男${ts}`,
      email: `audit-male-${ts}@example.com`,
      password: "123456",
      gender: "男",
      age: 32,
      city: "上海",
      job: "审计工程师",
      wechat: `audit_m_${ts}`,
    },
  });
  maleToken = male.data.token;
  ids.maleId = male.data.user.id;
  assert(!Object.hasOwn(male.data, "state"), "public client registration must not return a global state snapshot");
  assert(male.data.user.matchmakerIds?.length > 0, "default matchmakers missing");

  const profile = await req(BASE_CLIENT, "/client/profile", {
    method: "PATCH",
    token: maleToken,
    body: {
      name: `审计男更新${ts}`,
      avatar: "https://example.com/audit.png",
      matchmakerIds: ["m1"],
    },
  });
  assert(profile.data.user.photo === "https://example.com/audit.png", "avatar not saved");
  assert(profile.data.user.profileByMatchmaker?.m1?.status === "pending", "profile not pending");

  const login = await req(BASE_MM, "/auth/matchmaker/login", {
    method: "POST",
    body: { account: "HM-LILI", password: "123456" },
  });
  mmToken = login.data.token;
  const review = await req(BASE_MM, `/matchmaker/users/${ids.maleId}/profile-review`, {
    method: "PATCH",
    token: mmToken,
    body: { action: "approve" },
  });
  assert(review.data.user.profileByMatchmaker?.m1?.status === "approved", "profile not approved");
});

await step("vip scoped visibility and match request", async () => {
  const female = await req(BASE_CLIENT, "/auth/client/register", {
    method: "POST",
    body: {
      name: `审计女${ts}`,
      email: `audit-female-${ts}@example.com`,
      password: "123456",
      gender: "女",
      age: 29,
      city: "上海",
      job: "审计产品",
      wechat: `audit_f_${ts}`,
      matchmakerIds: ["m1"],
    },
  });
  ids.femaleId = female.data.user.id;
  assert(!Object.hasOwn(female.data, "state"), "public client registration must not return a global state snapshot");

  const blocked = await req(BASE_CLIENT, "/client/match-requests", {
    method: "POST",
    token: maleToken,
    body: { targetUserId: ids.femaleId, matchmakerId: "m1" },
    expected: [403],
  });
  assert(blocked.status === 403, "non-vip request should reject");

  const vip = await req(BASE_CLIENT, "/client/vip/redeem", {
    method: "POST",
    token: maleToken,
    body: { referralCode: "HM-LILI" },
  });
  assert(vip.data.user.servicePlans?.some((plan) => plan.status === "active" && plan.matchmakerId === "m1"), "m1 vip missing");

  const m1Target = await req(BASE_CLIENT, `/client/profiles/${ids.femaleId}`, { token: maleToken });
  assert(m1Target.data.data.user.wechat === `audit_f_${ts}`, "m1 target wechat hidden");
  const m2Target = await req(BASE_CLIENT, "/client/profiles/u4", { token: maleToken });
  assert(!Object.prototype.hasOwnProperty.call(m2Target.data.data.user, "wechat"), "m2 target wechat leaked");

  const created = await req(BASE_CLIENT, "/client/match-requests", {
    method: "POST",
    token: maleToken,
    body: { targetUserId: ids.femaleId, matchmakerId: "m1" },
  });
  ids.requestId = created.data.request.id;
  const visibleThreads = created.data.state.chatThreads.filter((thread) => thread.requestId === ids.requestId);
  assert(visibleThreads.filter((thread) => thread.type === "member_matchmaker").length === 1, "client should only receive its own 1v1 thread");
  assert(visibleThreads.filter((thread) => thread.type === "matchmaker_group").length === 1, "matchmaker_group must be visible to its participants");
  assert(!visibleThreads.some((thread) => thread.participants.some((participant) => participant.id === ids.femaleId) && thread.type === "member_matchmaker"), "client received the other member's private thread");
  // 管理员快照验证数据库仍按业务规则创建了双方各自的一对一线程。
  const adminState = await req(BASE_ADMIN, "/state", { token: adminToken });
  const allThreads = adminState.data.chatThreads.filter((thread) => thread.requestId === ids.requestId);
  assert(allThreads.filter((thread) => thread.type === "member_matchmaker").length === 2, "both member-matchmaker threads must be persisted");
  assert(allThreads.filter((thread) => thread.type === "matchmaker_group").length === 1, "group thread must be persisted");
  assert(created.data.request.groupThreadId, "groupThreadId missing in response");
});

await step("chat isolation and member chat gate", async () => {
  const clientThreads = await req(BASE_CLIENT, "/client/chat/threads", { token: maleToken });
  const privateThread = clientThreads.data.data.list.find(
    (thread) => thread.requestId === ids.requestId && thread.type === "member_matchmaker",
  );
  assert(privateThread, "missing private thread");
  const visibleGroup = clientThreads.data.data.list.find(
    (thread) => thread.requestId === ids.requestId && thread.type === "matchmaker_group",
  );
  assert(visibleGroup, "three-party group should be visible independently of member direct chat");
  await req(BASE_CLIENT, `/chat/threads/${privateThread.id}/messages`, {
    method: "POST",
    token: maleToken,
    body: { content: `审计一对一${ts}` },
  });

  const enabled = await req(BASE_MM, `/matchmaker/requests/${ids.requestId}/member-chat`, {
    method: "PATCH",
    token: mmToken,
    body: { enabled: true },
  });
  assert(!enabled.data.state.chatThreads.some(
    (thread) => thread.requestId === ids.requestId && thread.type === "member_member",
  ), "matchmaker state must not include a member-only conversation");
  const adminState = await req(BASE_ADMIN, "/state", { token: adminToken });
  const memberThread = adminState.data.chatThreads.find(
    (thread) => thread.requestId === ids.requestId && thread.type === "member_member",
  );
  assert(memberThread, "member_member not created");
  const group = adminState.data.chatThreads.find(
    (thread) => thread.requestId === ids.requestId && thread.type === "matchmaker_group",
  );
  assert(group && group.participants.length === 3, "group thread not created after approval");
  const groupContent = `审计三方群${ts}`;
  await req(BASE_MM, `/chat/threads/${group.id}/messages`, {
    method: "POST",
    token: mmToken,
    body: { content: groupContent },
  });
  const afterGroup = await req(BASE_ADMIN, "/state");
  const hits = afterGroup.data.chatMessages.filter((message) => message.content === groupContent);
  assert(hits.length === 1 && hits[0].threadId === group.id, "group message polluted other thread");
  await req(BASE_CLIENT, `/chat/threads/${memberThread.id}/messages`, {
    method: "POST",
    token: maleToken,
    body: { content: `审计会员互聊${ts}` },
  });
  await req(BASE_MM, `/matchmaker/requests/${ids.requestId}/member-chat`, {
    method: "PATCH",
    token: mmToken,
    body: { enabled: false },
  });
  const rejected = await req(BASE_CLIENT, `/chat/threads/${memberThread.id}/messages`, {
    method: "POST",
    token: maleToken,
    body: { content: "should reject" },
    expected: [403],
  });
  assert(rejected.status === 403, "disabled member chat should reject");
});

await step("request completion, rating and rematch", async () => {
  const completed = await req(BASE_CLIENT, `/client/match-requests/${ids.requestId}/outcome`, {
    method: "PATCH",
    token: maleToken,
    body: { outcome: "stable_progress" },
  });
  assert(completed.data.request.status === "已完成", "request status not completed");

  const rated = await req(BASE_CLIENT, `/client/match-requests/${ids.requestId}/rating`, {
    method: "PATCH",
    token: maleToken,
    body: { rating: 5, comment: "自动审计" },
  });
  assert(rated.data.request.customerRating === 5, "rating not saved");

  const rematch = await req(BASE_CLIENT, "/client/match-requests", {
    method: "POST",
    token: maleToken,
    body: { targetUserId: ids.femaleId, matchmakerId: "m1" },
  });
  assert(rematch.data.request.id !== ids.requestId, "completed request should allow rematch");
  ids.rematchRequestId = rematch.data.request.id;
});

await step("client cannot read or write whole state", async () => {
  const readRejected = await req(BASE_CLIENT, "/state", {
    token: maleToken,
    expected: [403],
  });
  assert(readRejected.status === 403, "client state read should reject");
  const writeRejected = await req(BASE_CLIENT, "/state", {
    method: "PUT",
    token: maleToken,
    body: { users: [] },
    expected: [403],
  });
  assert(writeRejected.status === 403, "client state write should reject");
});

const failed = results.filter((result) => !result.ok);
console.log("\nSUMMARY", { total: results.length, failed: failed.length, ids });
if (failed.length) process.exit(1);
