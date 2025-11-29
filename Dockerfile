# ============================================
# StreamHub - Next.js Docker 构建
# ============================================

# Stage 1: 依赖安装和构建
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9

# 复制所有文件（包括预生成的 icons）
COPY . .

# 安装依赖（跳过 postinstall）
RUN pnpm install --ignore-scripts

# 构建环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN pnpm build

# ============================================
# Stage 3: 生产运行
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建数据目录
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3005

# 环境变量
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"
ENV DATA_DIR=/app/data

# 启动应用
CMD ["node", "server.js"]
