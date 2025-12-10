# Stage de build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage de runtime (Nginx)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Angular application builder coloca los artefactos SPA en dist/<app>/browser
COPY --from=builder /app/dist/formularios-dinamicos-angular-20/browser /usr/share/nginx/html
EXPOSE 4210
CMD ["nginx", "-g", "daemon off;"]
