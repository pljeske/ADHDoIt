FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git && \
    go install github.com/air-verse/air@latest
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /adhdo-server ./cmd/server

FROM gcr.io/distroless/static-debian12
COPY --from=builder /adhdo-server /adhdo-server
ENTRYPOINT ["/adhdo-server"]
