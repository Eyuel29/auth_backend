# Use Bun as the base image
FROM oven/bun:latest

# Set working directory (Docker will create it if it doesn't exist)
WORKDIR /app/

# Copy package files first for caching bun install
COPY package.json bun.lock ./

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN bun install --production

# Copy the rest of the project
COPY . .

# Run initial auth setup commands
# You can chain commands with && to fail early if any step fails
RUN bun auth:generate && bun auth:migrate

# Expose the port your app uses (adjust if different)
EXPOSE 4000

# Default command to start the app
CMD ["bun", "dev"]
