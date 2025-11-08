FROM node:20
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN ./node_modules/.bin/tsc
EXPOSE 3000
CMD ["node", "dist/index.js"]
