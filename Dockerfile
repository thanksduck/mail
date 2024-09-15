FROM node:slim

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3456

CMD ["npm", "run", "prod"]