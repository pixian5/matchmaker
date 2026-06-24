import http from "http";
import crypto from "crypto";
import { exec } from "child_process";
import fs from "fs";

const PORT = Number(process.env.WEBHOOK_PORT || 9000);
const SECRET = process.env.WEBHOOK_SECRET || "";
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || "/opt/mediapeople/deploy/auto-deploy.sh";
const LOG_FILE = "/var/log/mediapeople-webhook.log";

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try { fs.appendFileSync(LOG_FILE, line); } catch {}
}

function verifySignature(body, signature) {
  if (!SECRET) return true; // 未配置 secret 时跳过验证
  const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

let deploying = false;

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk.toString(); });
  req.on("end", () => {
    const signature = req.headers["x-hub-signature-256"] || "";
    if (!verifySignature(body, signature)) {
      log("签名验证失败，拒绝请求");
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let payload;
    try { payload = JSON.parse(body); } catch { payload = {}; }

    const ref = payload.ref || "";
    // 只处理 main 或 master 分支的推送
    if (ref && !ref.endsWith("/main") && !ref.endsWith("/master")) {
      log(`忽略非主分支推送: ${ref}`);
      res.writeHead(200);
      res.end("Ignored");
      return;
    }

    if (deploying) {
      log("上次部署仍在进行，跳过本次");
      res.writeHead(202);
      res.end("Deploying, skipped");
      return;
    }

    log(`收到 push 事件 (${ref})，开始部署...`);
    res.writeHead(200);
    res.end("OK");

    deploying = true;
    exec(`bash ${DEPLOY_SCRIPT}`, { timeout: 300000 }, (error, stdout, stderr) => {
      deploying = false;
      if (error) {
        log(`部署失败: ${error.message}`);
      } else {
        log("部署成功完成");
      }
      if (stdout) log(`stdout: ${stdout.trim()}`);
      if (stderr) log(`stderr: ${stderr.trim()}`);
    });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  log(`Webhook 监听 http://127.0.0.1:${PORT}/webhook`);
});
