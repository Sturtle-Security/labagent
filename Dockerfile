FROM node:bullseye-slim
WORKDIR /app
RUN apt-get update && apt-get install -y curl wget --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY . .
RUN npm install
ENTRYPOINT ["node"]
CMD ["server.js"]