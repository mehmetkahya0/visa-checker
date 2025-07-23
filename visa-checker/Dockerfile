ARG BUILD_FROM
FROM $BUILD_FROM

# Install dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    jq \
    curl \
    tzdata

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && \
    npm cache clean --force

# Build the application
RUN npm run build

# Remove dev dependencies and clean up
RUN npm prune --production && \
    rm -rf src/ tsconfig.json && \
    npm cache clean --force

# Copy and setup run script
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Create necessary directories
RUN mkdir -p /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Set proper permissions
RUN chown -R root:root /app

CMD ["/run.sh"]
