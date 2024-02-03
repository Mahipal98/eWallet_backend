# this tells docker to use node image with ubuntu linux distribution
FROM node:18-alpine

ENV PORT=3000
RUN mkdir -p /app
# this sets the working directory to the /app
WORKDIR /app
# this copies package.json into the /app directory in the image filesystem
COPY package.json .
# npm install
RUN yarn install
# copy all files
COPY . .
# expose port
EXPOSE 3000
# this runs the command to run the app
CMD ["npm", "start"]