FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Build the application
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
