# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables
ARG VITE_LIFF_ID
ARG VITE_GRAPHQL_URL
ARG VITE_SERVER_PORT
ARG VITE_FETCH_TIMEOUT
ARG VITE_ALLOWED_HOSTS

ENV VITE_LIFF_ID=$VITE_LIFF_ID
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
ENV VITE_SERVER_PORT=$VITE_SERVER_PORT
ENV VITE_FETCH_TIMEOUT=$VITE_FETCH_TIMEOUT
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]