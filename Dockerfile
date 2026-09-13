FROM node:22-alpine

WORKDIR /app

# Copy package specifications
COPY package*.json ./
COPY mcp/package*.json ./mcp/

# Install MCP server dependencies
RUN npm --prefix mcp install

# Copy application files and skills catalog
COPY . .

# Build TypeScript to mcp/dist
RUN npm --prefix mcp run build

# Production runtime environment
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1

ENTRYPOINT ["node", "mcp/dist/server.js"]
