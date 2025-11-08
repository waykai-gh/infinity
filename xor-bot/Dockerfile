FROM node:20.5.0
WORKDIR /app
COPY package*.json ./
ENV NODE_ENV=development
RUN npm install
RUN npm list typescript && ls -l node_modules/.bin/tsc || echo "tsc missing"
COPY . .
RUN npm run build
CMD ["npm", "run", "dev"]
