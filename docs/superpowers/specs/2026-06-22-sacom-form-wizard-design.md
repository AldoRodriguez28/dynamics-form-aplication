# Diseño: Layout y wizard SACOM para el formulario (origin = SACOM)

- **Fecha:** 2026-06-22
- **Rama base:** `feat/170626-design-system-from-origin`
- **Estado:** Aprobado para implementación

## 1. Objetivo

Cuando un usuario llega con `origin === 'SACOM'` en el token, el **formulario de negocio**
(alta y edición) debe renderizarse con el look & feel del proyecto
`SACOM-modulo-free-account` (referencia: componente `business-drawer`), presentado como
un **wizard de pasos donde cada bloque dinámico es un paso**, y ocupando **toda la
pantalla** (será embebido vía `<iframe>` por el proyecto host).

El resto de la app (lista de negocios y demás rutas) debe permanecer con el look default
(ADN Digital), sin cambios visuales.

## 2. Requisitos

1. **Trigger:** `origin` del token igual a `SACOM` (normalizado: minúsculas/trim → `sacom`).
   Sigue el patrón existente de `brandx` pero **scoped a la ruta del formulario**.
2. **Scope:** solo la ruta del formulario `/:idClient/:businessId`. La lista
   `/:idClient` y cualquier otra ruta quedan en default.
3. **Presentación:** full-screen (100vw/100vh). El host provee el contenedor tipo drawer
   vía iframe; **de este lado no hay overlay, backdrop ni animación de panel**.
4. **Sin header de página:** se elimina el `<header>` actual de `BusinessFormComponent`
   (datos de cliente, contrato, estatus) y el botón "← Volver" en modo SACOM.
5. **Wizard:** un **bloque dinámico = un paso**, con indicador de pasos y botones
   **Siguiente / Atrás**. Aplica tanto a **alta** como a **edición**.
6. **Avance gateado:** "Siguiente" se bloquea si el sub-`FormGroup` del bloque actual es
   inválido (marca los campos como `touched` y no avanza).
7. **Preservar funcionalidad** del formulario dinámico: tipos de campo, validación,
   guardado (por bloque / guardar avance / finalizar), `readOnly`, modal de copiar bloque.
8. **Tokens SACOM:** primario `#FFD800`, botones negros tipo "pill", fuente **Inter**,
   inputs/steps redondeados (ver §7).

## 3. Estado actual relevante

- `ThemeService.applyFromOrigin(origin)` fija el tema activo (layoutKey) **y** pinta CSS
  vars en `document.documentElement`. Hoy es **global de sesión**, aplicado por el
  resolver y re-aplicado en el arranque por `themeInitializer` (`provideAppInitializer`).
- `LAYOUT_REGISTRY` mapea `layoutKey → componente de layout` (`default`, `brandx`). El
  layout envuelve el `<router-outlet>`, por lo que hoy aplica a **todas** las rutas.
- `THEME_REGISTRY` mapea `origin → ThemeConfig` (`cssVars`, `layoutKey`).
- Rutas (`app.routes.ts`):
  - `/:idClient/:businessId` → `BusinessFormComponent` (formulario).
  - `/:idClient` → `BusinessListComponent` (lista).
  - Ambas usan `authByTokenResolver`.
- `BusinessFormComponent` renderiza un `<header>` con metadatos del cliente + estatus y
  monta `<app-dynamic-form>`.
- `DynamicFormComponent` renderiza **todos los bloques a la vez** como acordeón
  (`<details>` por bloque) con un `<app-form-sidebar>`, acciones por bloque (Guardar,
  copiar) y acciones globales (Guardar avance / Finalizar). El render de campos es un
  `@switch` grande sobre `field.displayType`.

## 4. Arquitectura: theming consciente de la ruta

Se separan dos conceptos hoy fusionados:

- **Marca de sesión (`sessionOrigin`):** leída del token. Vive en `ThemeService` como
  señal. El resolver y `themeInitializer` **solo la setean**; ya no aplican tema global.
- **Tema efectivo:** lo calcula un **binder** (`ThemeRouteBinder`) que escucha la
  navegación del router y, en cada `NavigationEnd`, lee el `data` de la ruta activa más
  profunda:
  - Si la ruta tiene `data: { brandable: true }` **y** `sessionOrigin` tiene marca
    registrada en `THEME_REGISTRY` → `theme.applyFromOrigin(sessionOrigin)`.
  - En caso contrario → `theme.applyFromOrigin(null)` (vuelve a default, limpia
    `data-origin` y CSS vars).

Decisiones:

- `ThemeService` se mantiene **puro** (sin dependencia del `Router`). El binder orquesta.
- `applyFromOrigin` se conserva tal cual (aplica layoutKey + CSS vars + `data-origin`); el
  binder es quien decide cuándo llamarlo.
- `LayoutHost` sigue leyendo `theme.layoutKey()`, que ahora refleja el tema **efectivo**.
- La ruta del formulario se marca explícita: `data: { brandable: true }`.

Esto preserva la inversión en `LayoutHost`/registries. El test de regresión del swap de
layout se actualiza al nuevo modelo (el swap ahora también puede ocurrir al navegar
lista ↔ formulario).

### Cambios concretos

- `ThemeService`: agregar `sessionOrigin = signal<string | null>(null)` + setter.
- Nuevo `ThemeRouteBinder` (servicio `providedIn: 'root'`, arrancado en `AppComponent` o
  vía initializer) que se suscribe a `Router.events`.
- `auth-by-token.resolver.ts`: en lugar de `theme.applyFromOrigin(origin)`, hacer
  `theme.sessionOrigin.set(origin)` (el `storage.setOrigin` ya existe).
- `theme.initializer.ts`: sembrar `sessionOrigin` desde `storage.getOrigin()` en vez de
  aplicar el tema directamente.
- `app.routes.ts`: `data: { brandable: true }` en la ruta `/:idClient/:businessId`.

## 5. Layout y tokens SACOM

- Nuevo `src/app/layouts/sacom-layout/sacom-layout.component.*`:
  - Shell **full-screen** (100vw/100vh), fondo SACOM, atributo `data-layout="sacom"`,
    contiene `<router-outlet>`. **Sin header.**
  - Registrado en `LAYOUT_REGISTRY` bajo `sacom`.
- Nuevo `src/app/theme/themes/sacom.theme.ts` (`ThemeConfig`):
  - `origin: 'sacom'`, `layoutKey: 'sacom'`.
  - `cssVars` mapeados desde los tokens del drawer SACOM (ver §7).
  - Registrado en `THEME_REGISTRY`.
- Carga de la fuente **Inter** **solo** para SACOM (link/`@font-face` activado bajo el
  layout SACOM o `[data-origin="sacom"]`).

## 6. Wizard: un bloque = un paso

### 6.1 Extracción de `BlockFieldsComponent`

Se extrae el render de campos de **un** bloque (el `@switch` sobre `field.displayType`,
con sus filas/`field-grid`) a un componente presentacional reutilizable:

- `BlockFieldsComponent` con `@Input block`, `@Input form` (FormGroup), `@Input readOnly`.
- Lo usan **ambas** presentaciones (acordeón default y stepper SACOM) → no se duplica la
  lógica de campos.

### 6.2 Variante en `DynamicFormComponent`

- `DynamicFormComponent` deriva una `variant` del tema activo:
  `computed(() => theme.active().origin === 'sacom' ? 'sacom' : 'default')`.
- `variant === 'default'` → acordeón actual (`<details>` por bloque) usando `BlockFields`.
- `variant === 'sacom'` → **stepper**:
  - Estado `currentStep` (índice de bloque). Render **solo del bloque actual** vía
    `BlockFields`.
  - Indicador de pasos (puntos/numeración estilo `drawer-steps`) + etiqueta
    "Paso X de N — {block.title}".
  - **Siguiente:** valida el sub-`FormGroup` del bloque actual; si inválido, marca
    `markAllAsTouched()` y no avanza. **Atrás:** navegación libre.
  - El **sidebar** (`app-form-sidebar`) se oculta en modo SACOM.
  - El **modal de copiar bloque** se conserva (acción por bloque disponible).
- Footer del stepper mapea a métodos existentes:
  - Paso intermedio → "Siguiente" / "Atrás".
  - Último paso → "Finalizar" (`onFinalize`) + "Guardar avance" (`emitDraft`).
  - Acción por bloque → "Guardar" (`saveJustOneBlock`).

### 6.3 `BusinessFormComponent`

- En modo SACOM: oculta su `<header class="page__header">` y `.page__actions` (botón
  "← Volver"); contenedor full-screen sin paddings de página.
- En modo default: sin cambios.

## 7. Tokens SACOM (referencia)

Origen: `SACOM-modulo-free-account/src/app/styles/_variables.scss` y `_typography.scss`.

| Concepto | Valor |
| --- | --- |
| Primario | `#FFD800` |
| Primario oscuro | `#E5C200` |
| Primario tint | `#FFFBEB` |
| Fondo | `#F4F4F4` |
| Texto | `#1A1A1A` |
| Texto light / muted | `#666666` / `#767676` |
| Borde | `#E5E5E5` |
| Botón primario (acción) | negro `#1A1A1A`, hover `#2D2D2D` |
| Hero tint | `#FEF9C3` |
| Danger / success | `#DC2626` / `#16A34A` |
| Fuente | `'Inter', Arial, sans-serif` |
| Radios | sm 4 / md 8 / lg 12 / xl 16 / full 9999 |
| Pesos | regular 400 … black 900 |

Patrón visual del drawer a reproducir: inputs de 34px con borde 1.5px y `radius-md`, foco
en color primario, error `ng-invalid.ng-touched` con borde rojo + halo; secciones con
label uppercase; botones "pill" (`radius-full`); indicador de pasos con círculos +
líneas; footer con botones full-width.

## 8. Estilos de campos — riesgo principal

Los componentes de campo (`app-field-input`, `app-field-select`, `app-field-file`,
`app-field-textarea`, `app-field-phone`, etc.) tienen estilos propios. Bajo SACOM se
re-skinean con overrides **scoped por `[data-origin="sacom"]`** (inputs/labels/botones al
estilo drawer).

**Este es el grueso del esfuerzo y el mayor riesgo:** son muchos tipos de campo y hay que
revisar cada uno individualmente para que adopten el look drawer sin romper el default. Se
abordará tipo por tipo, verificando visualmente.

## 9. Pruebas

- **Binder route-aware:**
  - Ruta del formulario con `sessionOrigin = 'sacom'` → tema/layout SACOM.
  - Lista de negocios → default aunque `sessionOrigin = 'sacom'`.
  - Al navegar formulario → lista, se limpian `data-origin` y CSS vars.
- **Stepper:**
  - "Siguiente" no avanza si el bloque actual es inválido (campos quedan `touched`).
  - "Atrás" navega libre.
  - "Finalizar" / "Guardar avance" / "Guardar" por bloque emiten igual que en default.
  - Un bloque por paso; N pasos = N bloques.
- **Regresión:** actualizar `layout-host.integration.spec` y `theme.service.spec` al
  modelo route-aware.

## 10. Inventario de cambios

**Nuevos:**
- `src/app/theme/themes/sacom.theme.ts`
- `src/app/layouts/sacom-layout/sacom-layout.component.{ts,html,scss}`
- `src/app/.../block-fields/block-fields.component.{ts,html}` (extracción)
- `ThemeRouteBinder` (servicio)
- Estilos SACOM (layout + stepper + overrides de campos) + carga de fuente Inter

**Modificados:**
- `theme.service.ts` (añadir `sessionOrigin`)
- `theme.registry.ts` / `layout.registry.ts` (registrar `sacom`)
- `auth-by-token.resolver.ts` (setear `sessionOrigin`, no aplicar global)
- `theme.initializer.ts` (sembrar `sessionOrigin`)
- `app.routes.ts` (`data: { brandable: true }` en la ruta del form)
- `business-form.component.{ts,html}` (ocultar header en SACOM, contenedor full-screen)
- `dynamic-form.component.{ts,html}` (variante stepper, ocultar sidebar en SACOM, usar
  `BlockFields`)
- Tests: `layout-host.integration.spec`, `theme.service.spec`

## 11. Fuera de alcance

- Crear un flujo/ruta nueva de "alta de negocio" (no existe en este repo; alta y edición
  comparten `/:idClient/:businessId`).
- Lógica del lado del host/iframe (contenedor drawer, apertura/cierre) — vive en el
  proyecto SACOM.
- Cambios de comportamiento de guardado/validación más allá de re-presentar el formulario.
