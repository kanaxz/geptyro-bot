FROM node:20

WORKDIR /app

COPY . /app

RUN apt-get update && apt-get install -y ffmpeg

RUN npm install

RUN npm rebuild @discordjs/opus

CMD [ "node", "index"]