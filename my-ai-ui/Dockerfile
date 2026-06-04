FROM node:20-alpine

WORKDIR /usr/src/frontend

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Launches Vite/CRA dev engine
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]