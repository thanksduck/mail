FROM node:lts-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3456

CMD ["npm", "run", "prod"]