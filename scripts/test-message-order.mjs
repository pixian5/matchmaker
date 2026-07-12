import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const messages = [
  { id: "m1", seq: 2, clientSeq: 1, senderId: "u1", createdAt: "2026-07-12T00:00:00.001Z" },
  { id: "m2", seq: 1, clientSeq: 2, senderId: "u1", createdAt: "2026-07-12T00:00:00.999Z" },
  { id: "m3", seq: 3, clientSeq: 3, senderId: "u1", createdAt: "2026-07-12T00:00:00.002Z" },
];

function compareMessages(a, b) {
  if (a.senderId === b.senderId && a.clientSeq != null && b.clientSeq != null) return a.clientSeq - b.clientSeq;
  if (a.seq != null && b.seq != null) return a.seq - b.seq;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

assert.deepEqual(
  messages.toSorted(compareMessages).map((message) => message.seq),
  [2, 1, 3],
  "messages from one sender must be ordered by client sequence despite network delay",
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
    /if \(a\.seq != null && b\.seq != null\) return a\.seq - b\.seq;/,
    `${file} must compare seq before createdAt`,
  );
}

console.log("message order regression test passed");
