FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
ARG COMMIT=unknown
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" \
    -trimpath \
    -o /adhdoit-server ./cmd/server

FROM gcr.io/distroless/static-debian12
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="ADHDoIt Backend" \
      org.opencontainers.image.description="ADHD-friendly todo list — Go REST API" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.licenses="MIT"
COPY --from=builder /adhdoit-server /adhdoit-server
EXPOSE 8080
# 65532:0 — distroless nonroot UID, GID 0 for OpenShift arbitrary-UID compatibility
USER 65532:0
ENTRYPOINT ["/adhdoit-server"]
