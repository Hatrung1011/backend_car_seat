FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data/uploads/products

VOLUME ["/app/data/uploads"]

EXPOSE 3001

CMD ["node", "server.js"]
