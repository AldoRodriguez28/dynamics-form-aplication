FROM node:20-alpine AS build

# Crear carpeta de trabajo
WORKDIR /app

# Copiar dependencias e instalar
COPY package*.json ./
RUN npm install

# Copiar todo el código fuente
COPY . .
RUN npx ng build


# ===== Stage 2: Nginx =====
FROM nginx:alpine

# Config SPA
COPY default.conf /etc/nginx/conf.d/default.conf

# Copia artefactos (SIN /browser)
COPY --from=build /app/dist/formularios-dinamicos-angular-20 /usr/share/nginx/html


EXPOSE 80
# Correr ng serve
CMD ["nginx", "-g", "daemon off;"]
