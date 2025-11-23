# Use a small official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first (for better Docker layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
