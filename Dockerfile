FROM node:22-bookworm-slim

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

# Install dependencies using npm (respects trustedDependencies/ignoreScripts in package.json)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma client and build the Next.js app.
# NOTE: We always generate with SQLite at build time because it does NOT require
# a live database connection. For MySQL, the provider swap + re-generate happens
# at runtime in entrypoint.sh once the database container is actually reachable.
RUN echo "[*] Generating Prisma client (SQLite baseline)..." \
    && DATABASE_URL="file:./prisma/db/dev.db" npx prisma generate

RUN echo "[*] Building Next.js application..." \
    && DATABASE_URL="file:./prisma/db/dev.db" npm run build

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