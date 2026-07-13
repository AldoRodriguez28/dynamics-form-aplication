# 🧭 Architecture Guidelines – Angular 20 + Tailwind + Standalone + Native Federation

Estas guías están pensadas para un proyecto en **Angular 20**, usando:

- **Standalone Components**
- **TailwindCSS**
- Preparado como **Remote App** para **Angular Native Federation**
- Arquitectura orientada a **feature folders**, con **servicios**, **modelos** y **esquemas** bien definidos.

Codex, **SIEMPRE** sigue estas reglas al generar código o archivos nuevos en este proyecto.

---

## 1. Objetivos de arquitectura

1. Mantener el código **escalable**, **modular** y fácil de migrar a microfrontends con **Native Federation**.
2. Organizar el código por **features**, no por tipo de archivo.
3. Usar **Standalone Components** y evitar módulos innecesarios.
4. Definir **modelos/Interfaces TypeScript** claros para todas las entidades del dominio.
5. Mantener separado:
   - **Capa de presentación** (components)
   - **Capa de lógica de negocio** (services)
   - **Capa de acceso a datos** (services de API / repositories)
6. Asegurar que cada remote tenga un **punto de entrada claro** y una **API pública** mínima.

---

## 2. Stack & convenciones generales

- **Framework:** Angular 20 (standalone)
- **Estilos:** TailwindCSS + utilidades custom si hace falta
- **Routing:** `provideRouter`
- **DI:** `inject()` en lugar de `constructor` cuando sea práctico
- **State local:** Signals / inputs / outputs según convenga
- **HTTP:** `HttpClient` + servicios por feature

Convenciones de nombres:
- Componentes: `NombreFeatureComponent`
- Servicios: `NombreFeatureService`
- Modelos/interfaces: `NombreEntidad` (ej: `User`, `Order`)
- Esquemas/DTOs: `NombreDto` (ej: `CreateUserDto`)

---

## 3. Estructura de carpetas del proyecto

```txt
src/
  app/
    core/
      guards/
      interceptors/
      services/
      config/
      models/
      utils/
    shared/
      components/
      directives/
      pipes/
      ui/
    features/
      <feature-name>/
        pages/
        components/
        services/
        models/
        store/
        feature.routes.ts
    app.routes.ts
    app.config.ts
    bootstrap.ts
4. Standalone Components – Convenciones

Todos los componentes deben ser standalone (standalone: true)

Selector con prefijo del proyecto (app-, prod-, etc.)

Importar solo lo necesario: CommonModule, RouterModule, shared components, etc.

Usar señales (signal()) cuando sea útil.

5. TailwindCSS – Guía de uso

Usar clases utilitarias de Tailwind en plantillas.

Usar @apply solo en casos necesarios.

Crear UI components en shared/ui/ para patrones repetitivos.

6. Servicios – Reglas y patrones

Servicios globales en core/services/

Servicios por feature en features/<feature>/services/

Todos los servicios usan @Injectable({ providedIn: 'root' })

Usar inject(HttpClient) para acceso a datos.

7. Modelos y Esquemas

Cada feature tiene su propio folder models/

Interfaces para entidades (sin sufijo Interface)

DTOs si aplica (NombreDto)

No mezclar modelos de API con modelos de UI

8. Routing por Feature

app.routes.ts define rutas principales y lazy loading

Cada feature tiene su archivo feature.routes.ts

Las páginas deben estar en pages/

9. Preparación para Native Federation (Remote)

Mantén cada feature aislada, pensando en que puede ser un remote.

Define una API pública clara del Remote.

Crear archivo de entrada main.remote.ts.

Evitar dependencias cruzadas innecesarias entre features.

Usar componentes standalone para exportación hacia el host.

🚀 10. Regla OBLIGATORIA para Codex: Generación con CLI

Codex, cuando sea necesario crear cualquier componente, servicio, página, guard, directiva, pipe o feature, debes OBLIGATORIAMENTE usar el CLI de Angular con los siguientes comandos:

🧩 Componentes
ng generate component <path>/<nombre> --standalone

📄 Pages (que también son componentes)
ng generate component app/features/<feature>/pages/<nombre>-page --standalone

🧠 Servicios
ng generate service <path>/<nombre>

🎯 Guards
ng generate guard <path>/<nombre>

📦 Interfaces / Modelos

(No usa CLI – generar archivo manualmente)

app/features/<feature>/models/<nombre>.ts

🧱 Directivas
ng generate directive <path>/<nombre>

🔄 Pipes
ng generate pipe <path>/<nombre>