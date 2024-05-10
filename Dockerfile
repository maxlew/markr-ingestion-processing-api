FROM node:22-alpine
WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .
RUN npm ci

COPY . .

EXPOSE 3000
ENV NODE_ENV production
CMD ["node", "src/server.js"]
