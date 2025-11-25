#!/bin/bash

echo "========================================"
echo "StreamHub Docker 快速部署脚本"
echo "========================================"
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未找到 docker-compose"
    echo "请先安装 Docker 和 Docker Compose"
    exit 1
fi

# Step 1: Start container
echo "📦 步骤 1: 启动 Docker 容器..."
docker-compose up -d

# Wait for container to be ready
echo "⏳ 等待容器启动..."
sleep 5

# Step 2: Check if config.json was generated
echo ""
echo "📝 步骤 2: 检查配置文件..."

if docker exec streamhub test -f /app/config.json; then
    echo "✅ 配置文件已在容器内生成"
    
    # Step 3: Copy config.json out
    echo ""
    echo "📋 步骤 3: 复制配置文件到本地..."
    docker cp streamhub:/app/config.json ./config.json.tmp
    
    if [ -f ./config.json.tmp ]; then
        mv ./config.json.tmp ./config.json
        echo "✅ 配置文件已复制到: ./config.json"
        
        # Step 4: Instructions
        echo ""
        echo "========================================"
        echo "🎉 初始化完成！接下来的步骤："
        echo "========================================"
        echo ""
        echo "1. 编辑配置文件:"
        echo "   nano config.json"
        echo ""
        echo "2. 填入必需的配置:"
        echo "   - tmdb.apiKey (必需)"
        echo "   - emby.serverUrl 和 emby.apiKey (可选)"
        echo "   - moviepilot 配置 (可选)"
        echo ""
        echo "3. 修改 docker-compose.yml:"
        echo "   取消注释 config.json 挂载行"
        echo ""
        echo "4. 重启容器应用配置:"
        echo "   docker-compose down"
        echo "   docker-compose up -d"
        echo ""
        echo "5. 访问应用:"
        echo "   http://localhost:3000"
        echo ""
        echo "========================================"
    fi
else
    echo "⚠️  配置文件未生成，请查看容器日志:"
    echo "   docker-compose logs -f"
fi
