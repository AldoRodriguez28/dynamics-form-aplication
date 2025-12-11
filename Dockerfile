FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx ng build

FROM nginx:alpine

COPY default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/formularios-dinamicos-angular-20/browser/ /usr/share/nginx/html/

EXPOSE 4210
CMD ["nginx", "-g", "daemon off;"]

#docker formularios-dinamicos-angular-20 .

#docker rm -f sa-bcm-ui 2> $null
#docker rmi -f sa-bcm-content-ui:angular20 2> $null
#docker build --no-cache -t sa-bcm-content-ui:angular20 .
#docker run -d --name sa-bcm-ui -p 4210:80 sa-bcm-content-ui:angular20
