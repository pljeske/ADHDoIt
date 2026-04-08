FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_VAPID_PUBLIC_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
RUN npm run build

FROM caddy:2-alpine
COPY --from=builder /app/dist /srv
COPY --from=builder /app/public/sw.js /srv/sw.js
