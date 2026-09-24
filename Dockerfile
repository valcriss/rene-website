FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN npm ci

COPY backend backend
COPY frontend frontend

RUN npx prisma generate --schema backend/prisma/schema.prisma
RUN npm run build -w backend
RUN npm run build -w frontend

FROM node:24-alpine AS production-dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
COPY frontend/package.json frontend/package.json

RUN npm ci --omit=dev --omit=peer --workspace backend --include-workspace-root=false \
	&& npx prisma generate --schema backend/prisma/schema.prisma \
	&& rm -rf /app/node_modules/typescript \
	&& npm cache clean --force

FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY communes.csv ./communes.csv
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/backend-entrypoint.sh \
	&& chmod +x /usr/local/bin/backend-entrypoint.sh \
	&& rm -rf /usr/local/lib/node_modules/npm \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx \
	&& mkdir -p /app/uploads

WORKDIR /app/backend
EXPOSE 3000

ENTRYPOINT ["backend-entrypoint.sh"]
CMD ["node", "dist/index.js"]
