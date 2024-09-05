FROM node:slim

WORKDIR /app

COPY package.json ./

RUN npm install --production

COPY . .

EXPOSE 3456

CMD ["npm", "run", "prod"]