FROM node:lts-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:lts-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3456

CMD ["npm", "start"]