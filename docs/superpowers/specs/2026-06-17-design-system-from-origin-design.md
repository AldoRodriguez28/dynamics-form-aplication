# Diseño: Sistema de diseño según `origin` del token

**Fecha:** 2026-06-17
**Rama:** `feat/170626-design-system-from-origin`
**Estado:** Aprobado para plan de implementación

## Contexto y problema

La app de formularios dinámicos (Angular 20) hoy tiene un único diseño con colores
hardcodeados a lo largo de los SCSS (no hay sistema de tokens global). Un token llega
por URL, se valida en `authByTokenResolver` vía `loginByToken`, y el `bearerToken` (JWT)
se decodifica con `decodeJwtPayload` para extraer claims (`bcm.advertiser_id`,
`bcm.advertiser_name`, role) que se guardan en `TokenStorageService`.

Necesitamos que el JWT pueda traer un claim `origin` que indique **quién consume el
formulario**, y que la app aplique un diseño (tema + layout) según ese origin. Si el
token no trae `origin`, o trae uno no configurado, se usa el **diseño default actual**.

## Decisiones tomadas (brainstorming)

- **Fuente del `origin`:** claim dentro del JWT (igual que `advertiser_id`).
- **Alcance del cambio por origin:** colores/paleta, logo/branding, tipografía y layout.
- **Gobierno de temas:** config-driven en el front. Un archivo de config por marca;
  agregar una marca que reusa estructura no requiere tocar componentes.
- **Layout:** un shell dedicado por origin (máximo control). Una estructura nueva sí
  implica código (nuevo componente de layout) y redeploy.
- **Qué envuelve el layout:** solo el "shell" alrededor del formulario (header, sidebar,
  contenedor, branding, disposición general). Los campos del formulario dinámico
  (`field-*`) NO cambian por origin.
- **Fallback:** sin `origin` **o** `origin` desconocido → diseño/layout default actual.
- **Enfoque elegido (A):** registro de temas (config) + host de layout dinámico, con
  tokens de diseño como variables CSS. Separa limpiamente "tema" (config puro) de
  "estructura" (componente por origin).

## Arquitectura

### Piezas nuevas

- **`ThemeService`** (root): fuente de verdad. Resuelve `origin` → `ThemeConfig`, aplica
  tokens al DOM y expone el tema activo como signals (logo, `layoutKey`, brandName).
- **`theme.registry.ts`**: mapa `origin → ThemeConfig`. Un archivo de config por marca.
- **`layout.registry.ts`**: mapa `layoutKey → componente de layout`. Default + uno por
  estructura propia.
- **`LayoutHostComponent`**: lee el `layoutKey` del `ThemeService` y renderiza
  dinámicamente el shell, proyectando el `<router-outlet>` dentro.
- **`theme.tokens.scss`**: variables CSS (`--color-primary`, `--logo-url`,
  `--font-family`, etc.) en `:root`, con overrides por `[data-origin="..."]`.

### Flujo de datos

```
URL+token → authByTokenResolver → loginByToken → decode JWT
                          │
                          ├─ origin claim → TokenStorage.setOrigin
                          └─ ThemeService.applyFromOrigin(origin)
                                  ├─ THEME_REGISTRY[origin]  (o default)
                                  ├─ set data-origin + CSS vars en :root
                                  └─ set active() / layoutKey() (signals)
app.component → LayoutHost → [shell del origin] → <router-outlet>
```

1. Llega token por URL → resolver → `loginByToken` → JWT decodificado.
2. El resolver extrae el claim `origin` (junto a `advertiser_id`) y lo guarda en
   `TokenStorageService`.
3. El resolver llama a `ThemeService.applyFromOrigin(origin)`: busca en `THEME_REGISTRY`;
   si no existe o no hay origin → tema default. Aplica `data-origin` + variables CSS al
   `documentElement` antes de completar la navegación (sin parpadeo).
4. `app.component` monta `LayoutHostComponent`, que pinta el shell del origin (o default)
   alrededor del `router-outlet`. Los campos del form dinámico quedan intactos.

## Tokens de diseño (variables CSS)

Un único `src/styles/theme.tokens.scss` declara el contrato de diseño como variables CSS
en `:root` con los valores del tema **default** (los actuales). Cada origin sobreescribe
solo lo que cambia bajo un selector de atributo.

```scss
:root {
  /* Marca / color */
  --color-primary: #4338ca;
  --color-primary-contrast: #ffffff;
  --color-accent: #0ea5e9;
  --bg-app: #f8fafc;
  --text-base: #111827;

  /* Branding */
  --logo-url: url('/assets/brands/default/logo.svg');
  --logo-height: 32px;

  /* Tipografía */
  --font-family: 'Inter', system-ui, sans-serif;

  /* Forma / superficie (ajustes visuales del shell) */
  --radius-md: 0.875rem;
  --shadow-card: 0 4px 20px rgba(15, 23, 42, 0.06);
}

[data-origin='brandx'] {
  --color-primary: #d6206e;
  --color-accent: #ff8a00;
  --logo-url: url('/assets/brands/brandx/logo.svg');
  --font-family: 'BrandXSans', 'Inter', sans-serif;
}
```

- **Valores estáticos por marca:** viven en el SCSS bajo `[data-origin='...']`.
- **Valores dinámicos (runtime):** el `ThemeService` los empuja con
  `documentElement.style.setProperty('--x', value)` desde `ThemeConfig.cssVars`.
- **Atributo `data-origin`:** lo pone el `ThemeService` en `<html>`.
- **Tipografía por marca:** `@font-face` adicionales se cargan condicionalmente; si la
  fuente de la marca no está, cae a Inter por el fallback de `--font-family`.

### Alcance del refactor (acotado)

Como solo el **shell** cambia por origin, migrar de hardcoded → variables CSS se concentra
en:

- `styles.scss` (body, background, color base, fuente).
- SCSS del shell/chrome (sidebar, header, contenedores, botones del shell).

Los componentes de campo (`field-*`) **no** se tocan en esta fase salvo que un token
global los afecte naturalmente. Pueden migrar a tokens de forma incremental después.

## `ThemeService` y registro de temas

### `ThemeConfig`

```ts
export interface ThemeConfig {
  origin: string;            // clave que matchea el claim del JWT (normalizada)
  layoutKey: string;         // qué shell usar (ver registro de layouts)
  cssVars: Record<string, string>;  // overrides runtime opcionales
  logoUrl?: string;
  brandName?: string;
}
```

### `theme.registry.ts`

```ts
import { DEFAULT_THEME } from './themes/default.theme';
import { BRANDX_THEME } from './themes/brandx.theme';

export const THEME_REGISTRY: Record<string, ThemeConfig> = {
  [DEFAULT_THEME.origin]: DEFAULT_THEME,
  [BRANDX_THEME.origin]: BRANDX_THEME,
};
export const DEFAULT_ORIGIN = 'default';
```

> Agregar marca que reusa estructura = crear `themes/nueva.theme.ts` + una línea en el
> registro + (opcional) overrides en `theme.tokens.scss`. Sin tocar componentes.

### Servicio

```ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly active = signal<ThemeConfig>(DEFAULT_THEME);
  readonly layoutKey = computed(() => this.active().layoutKey);

  applyFromOrigin(origin: string | null): void {
    const key = origin?.trim().toLowerCase() ?? null;
    const theme = (key && THEME_REGISTRY[key]) || THEME_REGISTRY[DEFAULT_ORIGIN];
    this.active.set(theme);
    const root = document.documentElement;
    root.setAttribute('data-origin', theme.origin);
    Object.entries(theme.cssVars ?? {}).forEach(([k, v]) => root.style.setProperty(k, v));
  }
}
```

- **Normalización:** el origin se compara en minúsculas/trim para tolerar variaciones del
  claim.
- Sin match → default (cumple el fallback acordado).
- `active()` y `layoutKey()` los consumen el `LayoutHost` y cualquier componente que
  necesite logo/nombre de marca.

## `LayoutHostComponent` y registro de layouts

### `layout.registry.ts`

```ts
import { DefaultLayoutComponent } from './layouts/default-layout/default-layout.component';
import { BrandXLayoutComponent } from './layouts/brandx-layout/brandx-layout.component';

export const LAYOUT_REGISTRY: Record<string, Type<unknown>> = {
  default: DefaultLayoutComponent,
  brandx: BrandXLayoutComponent,
};
export const DEFAULT_LAYOUT = DefaultLayoutComponent;
```

### Contrato de un layout (shell)

Componente standalone que define su estructura (header/sidebar/branding/contenedor) y
proyecta el contenido ruteado con `<ng-content>`:

```html
<!-- default-layout.component.html -->
<div class="app-shell">
  <header class="app-header">
    <img [src]="theme.active().logoUrl" [alt]="theme.active().brandName" />
  </header>
  <main class="app-content">
    <ng-content></ng-content>
  </main>
</div>
```

- `DefaultLayoutComponent` reproduce el chrome actual (hoy mínimo: `app-shell` + outlet),
  así que el comportamiento default no cambia.
- Cada layout consume los tokens CSS y el `ThemeService` para logo/nombre.

### `LayoutHostComponent`

Selecciona el componente de shell según `theme.layoutKey()` y proyecta el `router-outlet`
dentro vía `NgComponentOutlet` con content projection:

```html
<!-- layout-host.component.html -->
<ng-container *ngComponentOutlet="currentLayout(); content: projected">
</ng-container>

<ng-template #projected>
  <router-outlet></router-outlet>
</ng-template>
```

```ts
currentLayout = computed(() =>
  LAYOUT_REGISTRY[this.theme.layoutKey()] ?? DEFAULT_LAYOUT
);
```

### Integración en `app.component`

Reemplaza el `app-shell` actual:

```html
<app-layout-host></app-layout-host>
```

> Estructura nueva = crear `layouts/nueva-layout/` + una línea en el registro, y apuntar
> el `layoutKey` de la config de la marca. Marcas que comparten estructura reutilizan el
> mismo `layoutKey`.

**Nota técnica:** proyectar `<router-outlet>` dentro de `NgComponentOutlet` requiere pasar
el contenido como `content` projection (nodos pre-renderizados), soportado en Angular 20;
se valida en el plan. Fallback si diera problemas: un `@switch` sobre `layoutKey()` en el
host (igual de simple, menos dinámico).

## Lectura del `origin`, timing y fallback

### Lectura del claim

En `authByTokenResolver`, junto a los claims actuales:

```ts
const origin = payload?.['bcm.origin'] ?? payload?.['origin'] ?? null;
if (origin != null) storage.setOrigin(String(origin));
themeService.applyFromOrigin(origin);   // ThemeService inyectado en el resolver
```

- Se agrega `setOrigin/getOrigin` a `TokenStorageService` (mismo patrón que
  `advertiser_id`), persistido para que recargas o navegaciones internas reapliquen el
  tema sin re-decodificar.
- El nombre exacto del claim (`bcm.origin` u otro) se confirma contra un token real en el
  plan; se deja lectura tolerante con fallback.

### Timing (evitar parpadeo)

- El tema se aplica **dentro del resolver**, que corre antes de activar la ruta del form →
  el shell correcto ya está cuando se pinta.
- Para arranques donde la ruta no pasa por el resolver (o recarga directa), un
  `APP_INITIALIZER` (o el constructor del `ThemeService`) reaplica desde
  `storage.getOrigin()`. Si no hay nada → default.
- El **default está como valor base en `:root`**, así que incluso antes de cualquier JS el
  render inicial ya es coherente (no hay flash a "sin estilo").

### Fallback

- Sin `origin` → default.
- `origin` presente pero sin entrada en `THEME_REGISTRY` → default (con `console.warn`
  para detectar marcas no registradas).
- Nunca bloquea ni rompe el form: el peor caso es el diseño default.

## Pruebas

Patrón Karma/Jasmine ya presente en el repo.

**`ThemeService` (unit):**
- `applyFromOrigin('brandx')` → `active()` es BrandX y `<html>` queda con
  `data-origin="brandx"` y las `cssVars` aplicadas.
- `applyFromOrigin(null)` y `applyFromOrigin('desconocido')` → tema default.
- Normalización: `'  BrandX  '` resuelve a `brandx`.

**Registros (unit):**
- Toda config en `THEME_REGISTRY` tiene un `layoutKey` que existe en `LAYOUT_REGISTRY`
  (test de integridad que protege al agregar marcas).
- Existe entrada `default` en ambos registros.

**`LayoutHostComponent` (component):**
- `layoutKey='default'` → renderiza `DefaultLayout`; `'brandx'` → `BrandXLayout`; key
  inexistente → `DefaultLayout`.
- El `router-outlet` se proyecta dentro del shell.

**Resolver (unit):**
- Token con claim `origin` → llama `applyFromOrigin` con ese valor y persiste en storage.
- Token sin claim → `applyFromOrigin(null)`.

**Fallback de arranque (`APP_INITIALIZER`):**
- Con `storage.getOrigin()` poblado reaplica el tema; vacío → default.

## Fuera de alcance (YAGNI)

- Migrar los componentes `field-*` a tokens CSS (fase posterior, incremental).
- Temas dinámicos servidos desde backend (se eligió config en el front).
- Variantes de layout reutilizables compartidas (se eligió un layout dedicado por origin;
  la reutilización ocurre solo cuando dos marcas comparten `layoutKey` explícitamente).
- Cambios de render/comportamiento en los campos del formulario por origin.
