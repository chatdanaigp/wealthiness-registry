FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port (Koyeb detects this automatically, but good practice)
EXPOSE 10000

# Start command
CMD ["npm", "run", "start:bot"]
