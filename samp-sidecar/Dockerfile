FROM node:20-bookworm-slim

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    libc6:i386 libncurses5:i386 libstdc++6:i386 libatomic1:i386 \
    wget curl unzip tar ca-certificates gnupg procps && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/sidecar

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 7777/udp 7777/tcp 24002/tcp

CMD ["node", "index.js"]
