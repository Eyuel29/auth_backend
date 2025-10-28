# Use Bun as the base image
FROM oven/bun:latest

# Set working directory (Docker will create it if it doesn't exist)
WORKDIR /app/

# Copy package files first for caching bun install
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy the rest of the project
COPY . .

# Run initial auth setup commands
# You can chain commands with && to fail early if any step fails
RUN bun auth:generate && bun auth:migrate

# Expose the port your app uses (adjust if different)
EXPOSE 3000

# Default command to start the app
CMD ["bun", "dev"]
