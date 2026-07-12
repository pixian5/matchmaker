import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function compareMessages(a, b) {
  if (a.senderRole === b.senderRole && a.senderId === b.senderId
      && a.deviceId && a.deviceId === b.deviceId
      && a.clientSeq != null && b.clientSeq != null) {
    return a.clientSeq - b.clientSeq;
  }
  const timeDiff = new Date(a.createdAt) - new Date(b.createdAt);
  if (timeDiff !== 0) return timeDiff;
  return a.id.localeCompare(b.id);
}

// 1. 同一设备内的消息：即便网络延迟导致服务器 seq 顺序反了，
//    也要按客户端序号展示，保持用户视角的发送顺序。
const sameDeviceMessages = [
  { id: "m1", seq: 2, clientSeq: 1, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T00:00:00.001Z" },
  { id: "m2", seq: 1, clientSeq: 2, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T00:00:00.999Z" },
  { id: "m3", seq: 3, clientSeq: 3, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T00:00:00.002Z" },
];

assert.deepEqual(
  sameDeviceMessages.toSorted(compareMessages).map((m) => m.clientSeq),
  [1, 2, 3],
  "same-device messages from one sender must be ordered by clientSeq despite network delay",
);

// 2. 多设备场景：同账号不同设备的消息按客户端创建时间排序
const multiDeviceMessages = [
  { id: "m1", seq: 2, clientSeq: 6, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T00:00:00.001Z" },
  { id: "m2", seq: 1, clientSeq: 6, senderId: "u1", senderRole: "client", deviceId: "dB", createdAt: "2026-07-12T00:00:00.999Z" },
  { id: "m3", seq: 3, clientSeq: 7, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T00:00:00.500Z" },
];

assert.deepEqual(
  multiDeviceMessages.toSorted(compareMessages).map((m) => m.createdAt),
  [
    "2026-07-12T00:00:00.001Z",
    "2026-07-12T00:00:00.500Z",
    "2026-07-12T00:00:00.999Z",
  ],
  "cross-device messages from same user must be ordered by createdAt",
);

// 3. 不同用户的消息：按客户端创建时间排序（保证真实发送顺序）
const crossUserMessages = [
  { id: "cm1", seq: 3, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T10:35:30.000Z", content: "没有" },
  { id: "cm2", seq: 1, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T10:35:31.000Z", content: "都" },
  { id: "cm3", seq: 2, senderId: "u1", senderRole: "client", deviceId: "dA", createdAt: "2026-07-12T10:35:32.000Z", content: "她们" },
];

// 注意：同设备同用户会命中 clientSeq 分支，这里用不同用户来测试跨用户场景
const crossUserDifferent = [
  { id: "cm1", seq: 3, senderId: "u1", senderRole: "client", createdAt: "2026-07-12T10:35:30.000Z", content: "没有" },
  { id: "cm2", seq: 1, senderId: "u2", senderRole: "matchmaker", createdAt: "2026-07-12T10:35:31.000Z", content: "都" },
  { id: "cm3", seq: 2, senderId: "u1", senderRole: "client", createdAt: "2026-07-12T10:35:32.000Z", content: "她们" },
];

assert.deepEqual(
  crossUserDifferent.toSorted(compareMessages).map((m) => m.content),
  ["没有", "都", "她们"],
  "cross-user messages must be ordered by createdAt, not seq",
);

// 4. 快速发送场景：一秒10条消息，seq乱序但createdAt精确到毫秒，
//    接收方应按发送时间排序而非服务端接收顺序
function generateBurstMessages(count, intervalMs) {
  const messages = [];
  const baseTime = new Date("2026-07-12T10:35:30.000Z").getTime();
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg_${String(i).padStart(4, "0")}`,
      seq: 0, // will be set based on arrival order
      clientSeq: i + 1,
      senderId: "u1",
      senderRole: "client",
      deviceId: "device-A",
      createdAt: new Date(baseTime + i * intervalMs).toISOString(),
      content: `msg-${i + 1}`,
    });
  }
  return messages;
}

// 模拟网络延迟导致服务端接收顺序乱序（偶数先到，奇数后到）
const burstMessages = generateBurstMessages(10, 100); // 100ms间隔，1秒10条
const shuffledMessages = [];
for (let i = 0; i < burstMessages.length; i += 2) shuffledMessages.push({ ...burstMessages[i] });
for (let i = 1; i < burstMessages.length; i += 2) shuffledMessages.push({ ...burstMessages[i] });
// 给打乱后的消息分配seq（模拟服务端接收顺序）
shuffledMessages.forEach((msg, idx) => { msg.seq = idx + 1; });

// 同设备同用户：应按 clientSeq 排序
const sortedSameDevice = shuffledMessages.toSorted(compareMessages);
assert.deepEqual(
  sortedSameDevice.map((m) => m.content),
  Array.from({ length: 10 }, (_, i) => `msg-${i + 1}`),
  "1-second burst (same device): must be ordered by clientSeq, not server seq",
);

// 不同用户快速交替发送：按 createdAt 排序
const userA = "u1", userB = "u2";
const interleavedMessages = [];
const base = new Date("2026-07-12T10:35:30.000Z").getTime();
for (let i = 0; i < 10; i++) {
  interleavedMessages.push({
    id: `a_${i}`,
    seq: i * 2 + 1,
    senderId: userA,
    senderRole: "client",
    createdAt: new Date(base + i * 100).toISOString(),
    content: `A${i + 1}`,
  });
  interleavedMessages.push({
    id: `b_${i}`,
    seq: i * 2 + 2,
    senderId: userB,
    senderRole: "matchmaker",
    createdAt: new Date(base + i * 100 + 50).toISOString(),
    content: `B${i + 1}`,
  });
}
// 打乱seq顺序模拟网络延迟
const interleavedShuffled = interleavedMessages
  .sort(() => Math.random() - 0.5)
  .map((m, i) => ({ ...m, seq: i + 1 }));

const sortedInterleaved = interleavedShuffled.toSorted(compareMessages);
assert.deepEqual(
  sortedInterleaved.map((m) => m.content),
  Array.from({ length: 10 }, (_, i) => [`A${i + 1}`, `B${i + 1}`]).flat(),
  "cross-user burst (interleaved): must be ordered by createdAt, not seq",
);

// 5. 同秒消息稳定排序（id作为二级排序键）
const sameSecondMessages = [
  { id: "b_msg", senderId: "u1", senderRole: "client", createdAt: "2026-07-12T10:35:30.000Z", content: "B" },
  { id: "a_msg", senderId: "u2", senderRole: "matchmaker", createdAt: "2026-07-12T10:35:30.000Z", content: "A" },
  { id: "c_msg", senderId: "u1", senderRole: "client", createdAt: "2026-07-12T10:35:30.000Z", content: "C" },
];

assert.deepEqual(
  sameSecondMessages.toSorted(compareMessages).map((m) => m.id),
  ["a_msg", "b_msg", "c_msg"],
  "same-second messages must be stably sorted by id",
);

// 6. 服务端SQL查询验证
const serverSource = await readFile("server/index.js", "utf8");
assert.match(
  serverSource,
  /ORDER BY created_at ASC, id ASC/,
  "server history query must order by created_at ASC, id ASC (not seq)",
);

// 7. 前端代码验证
for (const file of ["app.js", "uniapp/src/pages/chat-detail/index.vue"]) {
  const source = await readFile(file, "utf8");
  assert.match(
    source,
    /a\.deviceId && a\.deviceId === b\.deviceId/,
    `${file} must require matching deviceId for same-sender clientSeq ordering`,
  );
  assert.match(
    source,
    /a\.id\.localeCompare\(b\.id\)/,
    `${file} must use id.localeCompare for stable same-second ordering`,
  );
  assert.doesNotMatch(
    source,
    /if \(a\.seq != null && b\.seq != null\) return a\.seq - b\.seq;/,
    `${file} must NOT use seq as primary ordering key for cross-user messages`,
  );
}

console.log("message order regression test passed");
