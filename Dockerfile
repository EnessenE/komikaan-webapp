# Stage 1: Compile and Build angular codebase

# Use official node image as the base image
FROM node:latest as build

# Set the working directory
WORKDIR /usr/local/app/

# Add the source code to app
COPY ./ /usr/local/app/

# Install all the dependencies
RUN npm install

# Generate the build of the application
RUN npm run build --prod

# Stage 2: Serve app with nginx server

# Use official nginx image as the base image
FROM nginx:latest

RUN rm -rvf /usr/share/nginx/html
RUN dir -s
# Copy the build output to replace the default nginx contents.
COPY --from=build /usr/local/app/dist/komikthuis/browser /usr/share/nginx/html
COPY /nginx.docker.conf  /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80