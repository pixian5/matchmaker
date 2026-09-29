import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const server = await readFile("server/index.js", "utf8");
const loginPage = await readFile("uniapp/src/pages/matchmaker/login/index.vue", "utf8");
const authApi = await readFile("uniapp/src/api/auth.js", "utf8");
const legacyApp = await readFile("app.js", "utf8");
const stressScript = await readFile("scripts/stress-test-message-order.mjs", "utf8");
const businessAudit = await readFile("scripts/full-business-audit.mjs", "utf8");
const deployScript = await readFile("deploy/auto-deploy.sh", "utf8");
const dockerfile = await readFile("server/Dockerfile", "utf8");
const realNamePage = await readFile("uniapp/src/pages/realname/index.vue", "utf8");

const clientRegistration = server.slice(
  server.indexOf('app.post("/api/auth/client/register"'),
  server.indexOf('app.post("/api/auth/matchmaker/register"'),
);
const matchmakerRegistration = server.slice(
  server.indexOf('app.post("/api/auth/matchmaker/register"'),
  server.indexOf('app.get("/api/state"'),
);
assert.doesNotMatch(clientRegistration, /state:\s*publicState/);
assert.doesNotMatch(matchmakerRegistration, /state:\s*publicState/);
assert.match(clientRegistration, /user:\s*sanitizeUserSelf\(user\)/);
assert.match(matchmakerRegistration, /matchmaker:\s*sanitizeMatchmakerSelf\(matchmaker\)/);
assert.match(server, /app\.get\("\/api\/state",\s*requireAuth\(\["admin", "matchmaker"\]\)/);
assert.match(server, /app\.get\("\/api\/public\/agencies"/);
assert.match(server, /select id, name, city from agencies order by name, id/);
assert.match(server, /delete user\.idCard/);
assert.match(loginPage, /matchmakerLoginApi\(\{ account, password: loginForm\.password \}\)/);
assert.doesNotMatch(loginPage, /matchmakerOptions|appStore\.fetchState\(\);\s*\}\);/);
assert.match(authApi, /getPublicAgenciesApi\s*=\s*\(\)\s*=>\s*get\("\/public\/agencies",\s*undefined,\s*\{ noAuth: true \}\)/);

const clientLogin = server.slice(
  server.indexOf('app.post("/api/auth/client/login"'),
  server.indexOf('app.post("/api/auth/matchmaker/login"'),
);
const matchmakerLogin = server.slice(
  server.indexOf('app.post("/api/auth/matchmaker/login"'),
  server.indexOf('app.post("/api/auth/client/register"'),
);
// 服务端必须拒绝按 ID 直接登录。
assert.doesNotMatch(clientLogin, /\buserId\b/, "client login must not accept userId");
assert.doesNotMatch(matchmakerLogin, /\bmatchmakerId\b/, "matchmaker login must not accept matchmakerId");
assert.match(clientLogin, /account_required/);
assert.match(matchmakerLogin, /account_required/);

// 遗留静态页和自动化脚本也必须使用 account 登录。
assert.doesNotMatch(legacyApp, /body: JSON\(\{\s*matchmakerId: selectedId/, "legacy matchmaker login must not use matchmakerId");
assert.doesNotMatch(legacyApp, /userId: selectedId, password:/, "legacy client login must not use userId");
assert.match(legacyApp, /account: m\.code \|\| m\.phone \|\| m\.email/);
assert.match(legacyApp, /account: user\.wechat \|\| user\.phone \|\| user\.email/);
assert.match(stressScript, /"\/api\/auth\/client\/login", \{ account, password \}/);
assert.match(businessAudit, /body: \{ account: "HM-LILI", password: "123456" \}/);

// 部署前必须对 server/ 变更先做可恢复备份，镜像必须包含新模块和锁文件。
assert.match(deployScript, /pg_dump[\s\S]*探测|docker exec matchmaker-postgres pg_dump/);
assert.match(deployScript, /数据库备份完成/);
assert.match(deployScript, /ERROR: 数据库备份失败，已中止部署/);
assert.match(dockerfile, /COPY package\.json package-lock\.json \.\//);
assert.match(dockerfile, /COPY --from=builder --chown=app:app \/app\/node_modules \.\/node_modules/);
assert.match(dockerfile, /COPY --chown=app:app index\.js state-visibility\.js package\.json package-lock\.json \.\//);

// 历史身份证明文必须被一次性清理，并记录迁移版本。
assert.match(server, /create table if not exists app_migrations \(/);
assert.match(server, /20260929_remove_plaintext_id_cards/);
assert.match(server, /insert into app_migrations \(id\) values \(\$1\)/);
assert.ok(server.includes("jsonb_path_exists(raw, 'strict $.**.idCard ? (@ != null)')"), "legacy idCard migration must use a precise jsonb predicate");
assert.doesNotMatch(server, /raw::text like/);
const realNameRoute = server.slice(
  server.indexOf('app.post("/api/client/real-name"'),
  server.indexOf('app.post("/api/client/education-verify"'),
);
assert.match(realNameRoute, /delete user\.idCard/);
assert.doesNotMatch(realNameRoute, /user\.idCard\s*=/);
assert.match(realNameRoute, /realNameVerificationMode = "simulation"/);
assert.match(realNamePage, /未连接公安身份核验/);
assert.match(server, /migrateLegacyPlaintextIdCards\(\)/);
assert.match(server, /stripKeysDeep\(row\.raw, new Set\(\["idCard"\]\)\)/);

console.log("authentication contract regression test passed");
