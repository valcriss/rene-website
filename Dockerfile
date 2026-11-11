FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS builder
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

FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS production-dependencies
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
COPY frontend/package.json frontend/package.json

RUN mkdir -p frontend/node_modules \
	&& npm ci --omit=dev --omit=peer --include-workspace-root=false \
	&& npx prisma generate --schema backend/prisma/schema.prisma \
	&& rm -rf /app/node_modules/typescript \
	&& npm cache clean --force

FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

COPY --from=production-dependencies /app/node_modules ./node_modules
# npm may nest workspace dependencies under frontend/node_modules (pinia, vue-router and their
# deps are placed there). The SSR bundle imports them at runtime, so the runtime image needs them.
COPY --from=production-dependencies /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY communes.csv ./communes.csv
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh

RUN addgroup -S -g 10001 rene \
	&& adduser -S -D -H -u 10001 -G rene rene \
	&& sed -i 's/\r$//' /usr/local/bin/backend-entrypoint.sh \
	&& chmod +x /usr/local/bin/backend-entrypoint.sh \
	&& rm -rf /usr/local/lib/node_modules/npm \
	&& rm -f /usr/local/bin/npm /usr/local/bin/npx \
	&& mkdir -p /app/uploads /tmp \
	&& chown -R rene:rene /app /tmp

WORKDIR /app/backend
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["backend-entrypoint.sh"]
CMD ["node", "dist/index.js"]
