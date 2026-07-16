FROM oven/bun:1-debian

# Install OS dependencies required for Prisma/native packages and healthchecks.
# Debian/glibc avoids Alpine musl native-module mismatches in Ubuntu-like deployments.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      openssl \
      python3 \
      make \
      g++ \
      wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Accept database provider as build arg (sqlite or mysql)
ARG DB_PROVIDER=sqlite

# Install dependencies using Bun
COPY package.json package-lock.json* bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy the rest of the application code
COPY . .

# Swap Prisma provider if MySQL/MariaDB is selected, then generate and build
RUN if [ "$DB_PROVIDER" = "mysql" ]; then \
      sed -i 's/provider = "sqlite"/provider = "mysql"/g' prisma/schema.prisma && \
      bun run scripts/prepare-mysql-schema.js && \
      echo "[*] Building for MySQL/MariaDB..." && \
      DATABASE_URL="mysql://build:build@localhost:3306/build" bunx prisma generate && \
      DATABASE_URL="mysql://build:build@localhost:3306/build" bun run build; \
    else \
      echo "[*] Building for SQLite..." && \
      DATABASE_URL="file:./db/dev.db" bunx prisma generate && \
      DATABASE_URL="file:./db/dev.db" bun run build; \
    fi

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Ensure directories exist and have proper permissions for runtime
RUN mkdir -p public/uploads
RUN mkdir -p prisma/db
RUN chmod -R 755 public/uploads
RUN chmod -R 755 prisma/db
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Entrypoint handles migration and startup
CMD ["sh", "entrypoint.sh"]
