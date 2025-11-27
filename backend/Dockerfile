FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY app ./app

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "-m", "app.main"]
