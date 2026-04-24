# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm install

# Copy source code
COPY . .

# Build Vue application
RUN npm run build

# Stage 2: Production stage with Nginx
FROM nginx:alpine

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -S nginx && adduser -S nginx -G nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
