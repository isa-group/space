# Use an official Node.js runtime as the base image
FROM node:21.1-slim

# Set the working directory in the container
WORKDIR /usr/src/client

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and ./pnpm-lock.yaml to the container
COPY ./package.json .
COPY ./pnpm-lock.yaml .

# Install Node.js dependencies
RUN pnpm install 

# Copy the rest of the application source code to the container
RUN mkdir src
COPY ./src ./src
COPY ./public ./public

# Copy tsconfig.json to the container
COPY ./tsconfig.json .
COPY ./tsconfig.app.json .
COPY ./tsconfig.node.json .
COPY ./vite.config.ts .
COPY ./index.html .

ARG VITE_ENVIRONMENT
ARG VITE_BASE_PATH="/"
ARG VITE_SPACE_BASE_URL

ENV BASE_PATH=${VITE_BASE_PATH}

# Build your application
RUN pnpm run build
RUN pnpm add -D serve

# Conditional Reorganization Block:
# This only runs if VITE_FRONTEND_BASE_PATH is defined and is NOT equal to "/"
# RUN if [ -n "$VITE_FRONTEND_BASE_PATH" ] && [ "$VITE_FRONTEND_BASE_PATH" != "/" ]; then \
#     # Extract the directory name (e.g., from "/space/" to "space") to exclude it from the find command
#     FOLDER_NAME=$(echo "$VITE_FRONTEND_BASE_PATH" | sed 's/\///g'); \
#     echo "Reorganizing dist for subpath: $VITE_FRONTEND_BASE_PATH"; \
#     # Create the nested directory structure
#     mkdir -p ./dist${VITE_FRONTEND_BASE_PATH} && \
#     # Move everything EXCEPT index.html and the newly created subfolder into the subfolder
#     find ./dist -mindepth 1 -maxdepth 1 ! -name "index.html" ! -name "$FOLDER_NAME" \
#     -exec mv -t ./dist${VITE_FRONTEND_BASE_PATH}/ {} +; \
#     else \
#     echo "Skipping reorganization: App will be served from root (/)"; \
#     fi

# Specify the command to start the server
CMD ["pnpm", "exec", "serve", "-s", "./dist", "-l", "5050"]