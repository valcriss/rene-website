FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci
RUN npm install --no-save @rollup/rollup-linux-x64-musl

COPY backend backend
COPY frontend frontend

RUN npx prisma generate --schema backend/prisma/schema.prisma
RUN npm run build -w backend
RUN npm run build -w frontend

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh

RUN chmod +x /usr/local/bin/backend-entrypoint.sh \
	&& mkdir -p /app/uploads

WORKDIR /app/backend
EXPOSE 3000

ENTRYPOINT ["backend-entrypoint.sh"]
CMD ["node", "dist/index.js"]
