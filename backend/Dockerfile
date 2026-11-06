FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY shared ./shared
COPY public ./public
COPY scripts ./scripts
RUN mkdir -p /app/var && chown -R node:node /app
ENV NODE_ENV=production DEMO_MODE=false HOST=0.0.0.0 PORT=3001
USER node
EXPOSE 3001
CMD ["npm", "start"]
