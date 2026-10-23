FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/var/data
EXPOSE 3000
CMD ["npm", "start"]
