FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start"]
