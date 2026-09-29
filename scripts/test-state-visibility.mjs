import assert from "node:assert/strict";
import {
  serializeMatchmakerReviewUser,
  serializePublicMatchmaker,
  serializePublicState,
} from "../server/state-visibility.js";

const fixture = {
  currentUserId: "u1",
  adminLoggedIn: true,
  splits: { promo: 20, matchmaker: 35, platform: 45 },
  agencies: [
    { id: "a1", name: "甲机构", city: "上海", internalNote: "不公开" },
    { id: "a2", name: "乙机构", city: "北京" },
  ],
  matchmakers: [
    { id: "m1", name: "红娘甲", code: "MM-A", agencyId: "a1", phone: "13800000001", email: "a@example.test", passwordHash: "mm-hash" },
    { id: "m2", name: "红娘乙", code: "MM-B", agencyId: "a2", phone: "13800000002", email: "b@example.test", passwordHash: "mm-secret" },
  ],
  users: [
    {
      id: "u1", name: "会员甲", phone: "13900000001", email: "u1@example.test", wechat: "wx_client_1",
      realName: "真实姓名甲", idCard: "ID-1", passwordHash: "user-hash", matchmakerIds: ["m1"],
      profileByMatchmaker: { m1: { status: "approved", draft: { name: "会员甲", idCard: "nested-id" } }, m2: { draft: { secret: "other-mm" } } },
    },
    {
      id: "u2", name: "会员乙", phone: "13900000002", email: "u2@example.test", wechat: "wx_client_2",
      realName: "真实姓名乙", idCard: "ID-2", passwordHash: "user-hash-2", matchmakerIds: ["m1"],
      profileByMatchmaker: { m1: { status: "pending", draft: { name: "乙方草稿", diplomaNo: "DIP-SECRET" } }, m2: { draft: { secret: "other-mm" } } },
    },
    {
      id: "u3", name: "会员丙", phone: "13900000003", wechat: "wx_client_3", idCard: "ID-3",
      matchmakerIds: [], profileByMatchmaker: { m1: { status: "pending", draft: { name: "丙方草稿" } }, m2: { draft: { secret: "other-mm" } } },
    },
    { id: "u4", name: "无关会员", phone: "13900000004", wechat: "wx_client_4", idCard: "ID-4", matchmakerIds: [] },
  ],
  requests: [
    { id: "r1", fromUserId: "u1", toUserId: "u2", matchmakerId: "m1" },
    { id: "r2", fromUserId: "u3", toUserId: "u4", matchmakerId: "m2" },
  ],
  chatThreads: [
    { id: "t-u1-mm1", requestId: "r1", participants: [{ role: "matchmaker", id: "m1" }, { role: "client", id: "u1" }] },
    { id: "t-u2-mm1", requestId: "r1", participants: [{ role: "matchmaker", id: "m1" }, { role: "client", id: "u2" }] },
    { id: "t-group", requestId: "r1", participants: [{ role: "matchmaker", id: "m1" }, { role: "client", id: "u1" }, { role: "client", id: "u2" }] },
    { id: "t-members", requestId: "r1", participants: [{ role: "client", id: "u1" }, { role: "client", id: "u2" }] },
    { id: "t-other", requestId: "r2", participants: [{ role: "matchmaker", id: "m2" }, { role: "client", id: "u3" }] },
  ],
  chatMessages: [
    { id: "msg-u1", threadId: "t-u1-mm1", content: "甲和红娘私聊" },
    { id: "msg-u2", threadId: "t-u2-mm1", content: "乙和红娘私聊" },
    { id: "msg-group", threadId: "t-group", content: "三方消息" },
    { id: "msg-members", threadId: "t-members", content: "会员互聊" },
    { id: "msg-other", threadId: "t-other", content: "其他红娘私聊" },
  ],
  deals: [{ id: "d1", requestId: "r1", userId: "u1" }, { id: "d2", requestId: "r2", userId: "u3" }],
  promoCodes: [{ code: "P1", matchmakerId: "m1", usedBy: "u1" }, { code: "P2", matchmakerId: "m2", usedBy: "u3" }],
};

const client = serializePublicState(fixture, "client", "u1");
assert.deepEqual(client.requests.map((request) => request.id), ["r1"]);
assert.deepEqual(client.users.map((user) => user.id), ["u1", "u2"]);
assert.deepEqual(client.chatThreads.map((thread) => thread.id).sort(), ["t-group", "t-members", "t-u1-mm1"]);
assert.deepEqual(client.chatMessages.map((message) => message.id).sort(), ["msg-group", "msg-members", "msg-u1"]);
assert.equal(client.users.find((user) => user.id === "u1").passwordHash, undefined);
assert.equal(client.users.find((user) => user.id === "u1").idCard, undefined);
const publicTarget = client.users.find((user) => user.id === "u2");
for (const key of ["phone", "email", "wechat", "realName", "profileByMatchmaker", "passwordHash", "idCard"]) {
  assert.equal(publicTarget[key], undefined, `client response must omit target ${key}`);
}
assert.deepEqual(client.matchmakers.map((matchmaker) => matchmaker.id), ["m1"]);
assert.equal(client.matchmakers[0].phone, undefined);
assert.equal(client.matchmakers[0].email, undefined);
assert.equal(client.adminLoggedIn, undefined);

const matchmaker = serializePublicState(fixture, "matchmaker", "m1");
assert.deepEqual(matchmaker.requests.map((request) => request.id), ["r1"]);
assert.deepEqual(matchmaker.users.map((user) => user.id).sort(), ["u1", "u2", "u3"]);
assert.deepEqual(matchmaker.chatThreads.map((thread) => thread.id).sort(), ["t-group", "t-u1-mm1", "t-u2-mm1"]);
assert.deepEqual(matchmaker.chatMessages.map((message) => message.id).sort(), ["msg-group", "msg-u1", "msg-u2"]);
assert.equal(matchmaker.users.find((user) => user.id === "u1").idCard, undefined);
assert.equal(matchmaker.users.find((user) => user.id === "u1").passwordHash, undefined);
assert.deepEqual(Object.keys(matchmaker.users.find((user) => user.id === "u2").profileByMatchmaker), ["m1"]);
assert.equal(matchmaker.users.find((user) => user.id === "u2").profileByMatchmaker.m1.draft.diplomaNo, undefined);
assert.equal(matchmaker.chatThreads.some((thread) => thread.id === "t-members"), false);
assert.equal(matchmaker.deals.length, 0);
assert.equal(matchmaker.splits, undefined);
for (const user of matchmaker.users) {
  for (const key of ["phone", "email", "realName", "idCard", "passwordHash"]) {
    assert.equal(user[key], undefined, `matchmaker response must omit own-member ${key}`);
  }
  for (const profile of Object.values(user.profileByMatchmaker || {})) {
    assert.equal(profile.phone, undefined, "matchmaker must not see member contact details");
    assert.equal(profile.email, undefined, "matchmaker must not see member email");
  }
}
// 红娘只能看到自己的账号资料，不能看到其他红娘。
assert.deepEqual(matchmaker.matchmakers.map((item) => item.id), ["m1"]);
for (const clientUser of client.users) {
  if (clientUser.id === "u1") continue; // 本人可见自己的联系方式
  for (const key of ["phone", "email", "realName", "idCard", "passwordHash", "profileByMatchmaker"]) {
    assert.equal(clientUser[key], undefined, `client response must omit other-member ${key}`);
  }
}


const reviewUser = serializeMatchmakerReviewUser(fixture.users[1], "m1");
assert.deepEqual(Object.keys(reviewUser.profileByMatchmaker), ["m1"]);
for (const key of ["phone", "email", "realName", "idCard", "passwordHash"]) {
  assert.equal(reviewUser[key], undefined, `profile review must omit ${key}`);
}
assert.equal(reviewUser.profileByMatchmaker.m1.draft.diplomaNo, undefined);
const publicMatchmaker = serializePublicMatchmaker(fixture.matchmakers[0]);
assert.deepEqual(publicMatchmaker, {
  id: "m1", name: "红娘甲", code: "MM-A", agencyId: "a1", photo: null,
});

const admin = serializePublicState(fixture, "admin", "admin");
assert.equal(admin.users.length, 4);
assert.equal(admin.requests.length, 2);
assert.equal(admin.chatMessages.length, 5);
assert.equal(admin.users[0].passwordHash, undefined);
assert.equal(admin.users[0].idCard, undefined);
assert.equal(admin.users[0].profileByMatchmaker.m1.draft.idCard, undefined);
assert.throws(() => serializePublicState(fixture), /viewerRole/);
assert.throws(() => serializePublicState(fixture, "client"), /viewerId/);

console.log("state visibility regression test passed");
