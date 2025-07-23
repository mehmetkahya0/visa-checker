ARG BUILD_FROM
FROM $BUILD_FROM

# Install dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    jq \
    curl

# Set working directory
WORKDIR /app

# Copy everything from parent directory
COPY .. .

# Install dependencies and build
RUN npm install && npm run build

# Copy run script to root
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Create logs directory
RUN mkdir -p /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["/run.sh"]
