FROM node:20-alpine

WORKDIR /usr/src/backend

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

# Keeps development hot-reloading active
CMD ["npm", "run", "dev"]