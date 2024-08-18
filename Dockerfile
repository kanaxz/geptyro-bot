FROM node:20

WORKDIR /app

COPY . /app

RUN npm install

RUN npm rebuild @discordjs/opus

CMD [ "npm", "run", "prod"]