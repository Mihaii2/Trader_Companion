FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose port 5174
EXPOSE 5174

# Start the Vite dev server
CMD ["npm", "run", "dev", "--", "--host"]