# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm ci

# Install Playwright browsers
RUN npx playwright install chromium

# Copy source code
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed && npm start"]
