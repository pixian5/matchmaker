import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// 同一设备内的消息：即便网络延迟导致服务器 seq 顺序反了，
// 也要按客户端序号展示，保持用户视角的发送顺序。
const sameDeviceMessages = [
  { id: "m1", seq: 2, clientSeq: 1, senderId: "u1", deviceId: "dA", createdAt: "2026-07-12T00:00:00.001Z" },
  { id: "m2", seq: 1, clientSeq: 2, senderId: "u1", deviceId: "dA", createdAt: "2026-07-12T00:00:00.999Z" },
  { id: "m3", seq: 3, clientSeq: 3, senderId: "u1", deviceId: "dA", createdAt: "2026-07-12T00:00:00.002Z" },
];

function compareMessages(a, b) {
  if (a.senderRole === b.senderRole && a.senderId === b.senderId
      && a.deviceId && a.deviceId === b.deviceId
      && a.clientSeq != null && b.clientSeq != null) {
    return a.clientSeq - b.clientSeq;
  }
  if (a.seq != null && b.seq != null) return a.seq - b.seq;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

assert.deepEqual(
  sameDeviceMessages.toSorted(compareMessages).map((message) => message.seq),
  [2, 1, 3],
  "same-device messages from one sender must be ordered by client sequence despite network delay",
);

// 多设备场景：同账号不同设备的消息按服务器实际接收顺序（seq）排序
const multiDeviceMessages = [
  { id: "m1", seq: 2, clientSeq: 6, senderId: "u1", deviceId: "dA", createdAt: "2026-07-12T00:00:00.001Z" },
  { id: "m2", seq: 1, clientSeq: 6, senderId: "u1", deviceId: "dB", createdAt: "2026-07-12T00:00:00.999Z" },
  { id: "m3", seq: 3, clientSeq: 7, senderId: "u1", deviceId: "dA", createdAt: "2026-07-12T00:00:00.500Z" },
];

assert.deepEqual(
  multiDeviceMessages.toSorted(compareMessages).map((message) => message.seq),
  [1, 2, 3],
  "cross-device messages from same user must be ordered by server seq (actual receive order)",
);

const serverSource = await readFile("server/index.js", "utf8");
assert.match(
  serverSource,
  /ORDER BY CASE WHEN raw \? 'seq' THEN \(raw->>'seq'\)::int ELSE NULL END ASC NULLS LAST,\s*created_at ASC/,
  "history query must use seq as the primary ordering key",
);

for (const file of ["app.js", "uniapp/src/pages/chat-detail/index.vue"]) {
  const source = await readFile(file, "utf8");
  assert.match(
    source,
    /a\.deviceId && a\.deviceId === b\.deviceId/,
    `${file} must require matching deviceId before falling back to seq for same-sender ordering`,
  );
  assert.match(
    source,
    /if \(a\.seq != null && b\.seq != null\) return a\.seq - b\.seq;/,
    `${file} must compare seq before createdAt`,
  );
}

console.log("message order regression test passed");
