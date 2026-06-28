FROM node:20-slim

WORKDIR /app

# Copy dependency configs
COPY package*.json ./
RUN npm ci

# Copy frontend source
COPY . .

# Build Next.js production app
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
