# Node + ffmpeg image for the video proxy.
FROM node:20-bookworm-slim

# ffmpeg is required by the frame extractor.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev || npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm install typescript tsx --no-save && npx tsc -p tsconfig.json

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "dist/server.js"]
