FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
COPY test ./test
USER node
EXPOSE 3001
CMD ["node", "--no-warnings", "src/server.js"]
