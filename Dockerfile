# Stage 1: Build the React application
# Use a Node.js image to build the React application
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React application for production
# This command assumes your project has a 'build' script defined in package.json
# which typically outputs static files to a 'build' directory.
RUN npm run build

# Stage 2: Serve the application with Nginx
# Use a lightweight Nginx image to serve the static files
FROM nginx:alpine

# Copy the Nginx default configuration file
# This is a basic configuration that serves static files.
# You might want to customize this for more complex setups (e.g., routing, SSL).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default Nginx index.html to avoid conflicts
RUN rm -rf /usr/share/nginx/html/*

# Copy the built React application files from the builder stage to Nginx's public directory
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80, the default HTTP port for Nginx
EXPOSE 80

# Command to run Nginx when the container starts
CMD ["nginx", "-g", "daemon off;"]

# --- Nginx Configuration (nginx.conf) ---
# This file should be placed in the same directory as your Dockerfile
# to be copied into the Docker image.
#
# server {
#   listen 80;
#
#   root /usr/share/nginx/html;
#   index index.html index.htm;
#
#   location / {
#     try_files $uri $uri/ /index.html;
#   }
#
#   error_page 500 502 503 504 /50x.html;
#   location = /50x.html {
#     root /usr/share/nginx/html;
#   }
# }
