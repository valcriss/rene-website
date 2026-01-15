FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm install
COPY backend backend
COPY frontend frontend
RUN npm run build -w backend
RUN npm run build -w frontend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
RUN npm install --omit=dev
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]
