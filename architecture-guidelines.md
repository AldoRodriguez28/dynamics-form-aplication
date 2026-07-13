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
- **Estilos:** TailwindCSS + utilidades custom si hace falta.
- **Routing:** `provideRouter`.
- **DI:** `inject()` en lugar de `constructor` cuando sea práctico.
- **State local:** Signals / inputs / outputs según convenga.
- **HTTP:** `HttpClient` + servicios por feature.

Convenciones de nombres:
- Componentes: `NombreFeatureComponent` (ej: `DashboardPageComponent`).
- Servicios: `NombreFeatureService` (ej: `UserService`).
- Modelos/interfaces: `NombreEntidad` (ej: `User`, `Order`), sin sufijo `Interface`.
- Esquemas/DTOs: `NombreEntidadDto` o `NombreDto` (ej: `CreateUserDto`).

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
        utils/
        feature.routes.ts
    app.routes.ts
    app.config.ts
    bootstrap.ts
