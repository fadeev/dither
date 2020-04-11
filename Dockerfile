FROM node:13-slim
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
CMD sleep 10 && npm install && npm run start