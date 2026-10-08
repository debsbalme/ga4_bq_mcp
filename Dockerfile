# ---------------------------------------------------
# Stage 1: Build the Vite frontend & compile server.ts
# ---------------------------------------------------
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
# Install ALL dependencies (including esbuild and typescript)
RUN npm install

COPY . .
# Runs vite build && esbuild
RUN npm run build

# ---------------------------------------------------
# Stage 2: Minimal Production Runtime
# ---------------------------------------------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

# Install ONLY runtime dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the build output from the builder stage
# (This contains the Vite static bundle and dist/server.cjs)
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["npm", "start"]
