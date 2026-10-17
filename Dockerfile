FROM node:26-alpine AS builder

RUN npm install -g pnpm@12.8.1
WORKDIR /src
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @coin-book/web build

FROM caddy:2.10-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /src/apps/web/build /srv

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=4s --retries=3 CMD ["wget", "-q", "--spider", "http://127.0.0.1/"]
