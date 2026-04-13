FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_VAPID_PUBLIC_KEY
ARG VERSION=0.0.0-local
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
RUN npm version --no-git-tag-version --allow-same-version "${VERSION#v}"
RUN npm run build

FROM caddy:2-alpine
ARG VERSION=0.0.0-local
ARG COMMIT=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="ADHDoIt Frontend" \
      org.opencontainers.image.description="ADHD-friendly todo list — React SPA" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="MIT"

COPY ./Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv
COPY --from=builder /app/public/sw.js /srv/sw.js

# Fix ownership and permissions so Caddy runs as a non-root user and is
# compatible with OpenShift's arbitrary-UID model (assigned UID belongs to GID 0).
# /data and /config are Caddy's XDG storage dirs (set by the base image via ENV).
# They need to be group-writable; /srv and /etc/caddy only need group-readable.
RUN mkdir -p /data/caddy /config/caddy \
    && chown -R 1001:0 /data /config /srv /etc/caddy \
    && chmod -R g+rwX /data /config \
    && chmod -R g+rX  /srv /etc/caddy

EXPOSE 8080
# 1001:0 = non-root UID, GID 0 (root group) — satisfies OpenShift restricted SCC
USER 1001:0
