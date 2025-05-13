# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port your Fastify app runs on
EXPOSE 3010

# Start the Fastify server
CMD ["npm", "start"]