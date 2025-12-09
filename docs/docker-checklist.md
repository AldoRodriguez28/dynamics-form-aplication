# Checklist para dockerizar el proyecto Angular

1) Prerrequisitos
- Tener Docker Desktop o Docker Engine instalado y corriendo.
- Opcional: Node 18+ y npm para probar el build local (`npm ci && npm run build`).

2) Limpiar y construir el proyecto
- Instala dependencias: `npm ci`.
- Ejecuta el build de Angular para validar: `npm run build`.
- Verifica que se genere `dist/formularios-dinamicos-angular-20`.

3) Crear el Dockerfile (multi-stage recomendado)
- Stage builder (Node): copia `package*.json`, corre `npm ci`, luego copia el resto y ejecuta `npm run build`.
- Stage final (Nginx): copia el contenido de `dist/formularios-dinamicos-angular-20` a `/usr/share/nginx/html`.
- Expone puerto 80 y usa la imagen base `nginx:alpine`. (Si necesitas rutas SPA, agrega una regla en `nginx.conf` que devuelva `index.html` en 404).

4) Dockerfile de ejemplo
```Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# Nota: con el builder "application" de Angular, los artefactos SPA quedan en dist/<app>/browser
COPY --from=builder /app/dist/formularios-dinamicos-angular-20/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

5) Construir la imagen
- `docker build -t formularios-dinamicos-angular .`

6) Probar la imagen local
- `docker run --rm -p 8080:80 formularios-dinamicos-angular`
- Abre `http://localhost:8080` y verifica la app.

7) (Opcional) Docker Compose
- Crea `docker-compose.yml` con:
```yaml
version: "3.9"
services:
  web:
    build: .
    ports:
      - "8080:80"
```
- Levanta con `docker compose up --build`.

8) (Opcional) Ajustes adicionales
- Cache de dependencias: usar `npm ci` y aprovechar capas de `package*.json`.
- Variables de entorno en build: utiliza `--build-arg` y `environment.ts` si necesitas endpoints configurables en tiempo de build.
- Healthcheck: agregar `HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1` en el stage final.

9) Publicar
- Taggea y sube al registry que uses (ej. `docker tag ...` y `docker push ...`).
