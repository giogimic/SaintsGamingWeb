# Go MMO realtime backend — parallel to Next.js web on :3000.
# Default host publish port is 3001 (see docker-compose / setup-go-mmo.sh).
FROM golang:1.25-bookworm AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/go-mmo ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /out/go-mmo /app/go-mmo

RUN mkdir -p /app/data

ENV GO_MMO_HOST=0.0.0.0
ENV GO_MMO_PORT=3001
ENV GO_MMO_DATABASE_URL=file:/app/data/go-mmo.db
ENV GO_MMO_DEV_AUTH=true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/healthz || exit 1

CMD ["/app/go-mmo"]
