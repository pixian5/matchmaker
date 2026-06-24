#!/usr/bin/env python3
"""
mediapeople webhook server
接收 GitHub push 事件，触发服务器自动部署

用法:
  WEBHOOK_SECRET=your_secret python3 webhook_server.py
  
  或设置环境变量后后台运行 (推荐通过 systemd 管理)
"""

import http.server
import hashlib
import hmac
import json
import os
import subprocess
import threading
import logging
import sys
from datetime import datetime

PORT = int(os.environ.get("WEBHOOK_PORT", 9000))
SECRET = os.environ.get("WEBHOOK_SECRET", "").encode()
DEPLOY_SCRIPT = os.environ.get("DEPLOY_SCRIPT", "/opt/mediapeople/deploy/auto-deploy.sh")
LOG_FILE = "/var/log/mediapeople-webhook.log"

# 配置日志同时输出到文件和标准输出
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE),
    ]
)
logger = logging.getLogger(__name__)

deploying = threading.Lock()


def verify_signature(body: bytes, signature: str) -> bool:
    if not SECRET:
        return True  # 未配置 secret 时跳过验证
    expected = "sha256=" + hmac.new(SECRET, body, hashlib.sha256).hexdigest()
    try:
        return hmac.compare_digest(expected.encode(), signature.encode())
    except Exception:
        return False


def run_deploy():
    logger.info("开始执行部署脚本...")
    try:
        result = subprocess.run(
            ["bash", DEPLOY_SCRIPT],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            logger.info("部署成功完成")
        else:
            logger.error(f"部署脚本退出码: {result.returncode}")
        if result.stdout:
            logger.info(f"stdout: {result.stdout.strip()}")
        if result.stderr:
            logger.warning(f"stderr: {result.stderr.strip()}")
    except subprocess.TimeoutExpired:
        logger.error("部署超时 (300s)")
    except Exception as e:
        logger.error(f"部署异常: {e}")
    finally:
        deploying.release()


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # 禁用默认访问日志

    def do_POST(self):
        if self.path != "/webhook":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        signature = self.headers.get("X-Hub-Signature-256", "")

        if not verify_signature(body, signature):
            logger.warning("签名验证失败，拒绝请求")
            self.send_response(403)
            self.end_headers()
            self.wfile.write(b"Forbidden")
            return

        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        ref = payload.get("ref", "")
        if ref and not (ref.endswith("/main") or ref.endswith("/master")):
            logger.info(f"忽略非主分支推送: {ref}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Ignored")
            return

        if not deploying.acquire(blocking=False):
            logger.info("上次部署仍在进行，跳过本次")
            self.send_response(202)
            self.end_headers()
            self.wfile.write(b"Deploying, skipped")
            return

        logger.info(f"收到 push 事件 ({ref})，启动部署线程...")
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"OK")

        thread = threading.Thread(target=run_deploy, daemon=True)
        thread.start()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"OK")
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    server = http.server.HTTPServer(("127.0.0.1", PORT), WebhookHandler)
    logger.info(f"Webhook 监听 http://127.0.0.1:{PORT}/webhook")
    logger.info(f"健康检查: http://127.0.0.1:{PORT}/health")
    logger.info(f"部署脚本: {DEPLOY_SCRIPT}")
    logger.info(f"Signature 验证: {'开启' if SECRET else '关闭 (未设置 WEBHOOK_SECRET)'}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("服务已停止")
