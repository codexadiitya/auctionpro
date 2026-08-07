FROM node:25-alpine

WORKDIR /app/backend

# Install production dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy Node.js backend application source
COPY backend/ ./

# Expose default port
EXPOSE 8000

# Start MERN Stack Express Server
CMD ["node", "index.js"]
