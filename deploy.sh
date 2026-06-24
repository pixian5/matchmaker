#!/bin/bash

# 退出脚本如果任何命令失败
set -e

echo "=== 1. 运行本地语法与配置检查 ==="
node --check app.js
node --check server/index.js
POSTGRES_PASSWORD=dummy JWT_SECRET=dummy docker compose -f compose.yml -f compose.ssl.yml config > /dev/null
echo "✓ 语法与 Docker 配置检查通过！"
echo ""

# 检查是否有未提交的修改
if [ -n "$(git status --porcelain)" ]; then
    echo "=== 2. 发现未提交的更改，准备进行 Git 提交 ==="
    git status --short
    echo ""
    
    # 获取 commit 信息
    COMMIT_MSG="$1"
    if [ -z "$COMMIT_MSG" ]; then
        read -p "请输入 Git Commit 提交信息: " COMMIT_MSG
    fi
    
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="deploy: auto-commit at $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    
    git add -A
    git commit -m "$COMMIT_MSG"
    echo "✓ 代码已本地提交: $COMMIT_MSG"
    echo ""
else
    echo "=== 2. 没有检测到未提交的更改，跳过 Commit ==="
    echo ""
fi

echo "=== 3. 推送代码至 GitHub ==="
git push origin master
echo "✓ 代码推送成功！"
echo ""

echo "=== 4. 连接服务器并执行部署 ==="
ssh -i ~/.ssh/mediapeople_uk_ed25519 -o StrictHostKeyChecking=accept-new root@uk.sbbz.tech "bash /opt/mediapeople/deploy/auto-deploy.sh"
echo "✓ 服务器部署指令执行完成！"
echo ""

echo "=== 5. 运行健康检查 ==="
echo "等待 3 秒让服务启动..."
sleep 3

echo "检查 HTTP 端口 (8095-8098):"
for port in 8095 8096 8097 8098; do
  printf "  HTTP Port %s: " "$port"
  status_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 5 http://uk.sbbz.tech:$port/api/health || echo "Failed")
  if [ "$status_code" = "200" ]; then
    echo "正常 (200)"
  else
    echo "异常 (HTTP $status_code)"
  fi
done

echo "检查 HTTPS 端口 (9445-9448):"
for port in 9445 9446 9447 9448; do
  printf "  HTTPS Port %s: " "$port"
  status_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 5 https://uk.sbbz.tech:$port/api/health || echo "Failed")
  if [ "$status_code" = "200" ]; then
    echo "正常 (200)"
  else
    echo "异常 (HTTP $status_code)"
  fi
done
echo ""

echo "=== 部署与验证全部完成！ ==="
