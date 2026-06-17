# Sistema de diseño según `origin` del token — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar un tema (colores/logo/tipografía) y un layout (shell) según el claim `origin` del JWT, con fallback al diseño default cuando no hay origin o es desconocido.

**Architecture:** `ThemeService` es la fuente de verdad: resuelve `origin` → `ThemeConfig` (desde `THEME_REGISTRY`, config-driven en el front) y aplica `data-origin` + variables CSS al `<html>`. Un `LayoutHostComponent` renderiza dinámicamente el shell del origin vía `NgComponentOutlet` desde `LAYOUT_REGISTRY`; **cada layout incluye su propio `<router-outlet>`** (no se usa content-projection, lo que resuelve la nota técnica abierta del spec y evita la fragilidad de proyectar el outlet). El `origin` se lee en `authByTokenResolver` y se reaplica al arrancar vía `provideAppInitializer` desde `TokenStorageService`.

**Tech Stack:** Angular 20 (standalone components, signals, `NgComponentOutlet`, `provideAppInitializer`), SCSS con CSS custom properties, Karma + Jasmine.

---

## Decisión de implementación que ajusta el spec

El spec (Sección 4) dibujó el layout con `<ng-content>` + content-projection del `<router-outlet>` vía `NgComponentOutlet`, y dejó marcado validarlo en el plan. **Resolución:** cada componente de layout incluye `<router-outlet>` directamente en su template. Como `NgComponentOutlet` instancia un solo layout a la vez, existe un único `router-outlet` activo. Esto mantiene el registro como fuente de verdad (agregar marca que reusa estructura = solo config; estructura nueva = nuevo componente + una línea en el registro) sin la fragilidad de proyectar el outlet.

## Estructura de archivos

**Crear:**
- `src/styles/theme.tokens.scss` — contrato de variables CSS (`:root` default + overrides `[data-origin]`).
- `src/app/theme/theme-config.ts` — interface `ThemeConfig`.
- `src/app/theme/themes/default.theme.ts` — `DEFAULT_THEME`.
- `src/app/theme/themes/brandx.theme.ts` — `BRANDX_THEME` (ejemplo de marca).
- `src/app/theme/theme.registry.ts` — `THEME_REGISTRY`, `DEFAULT_ORIGIN`.
- `src/app/theme/theme.registry.spec.ts` — tests de integridad de registros.
- `src/app/theme/theme.service.ts` — `ThemeService`.
- `src/app/theme/theme.service.spec.ts`.
- `src/app/theme/theme.initializer.ts` — factory para `provideAppInitializer`.
- `src/app/theme/theme.initializer.spec.ts`.
- `src/app/layouts/default-layout/default-layout.component.ts` (+ `.html`, `.scss`).
- `src/app/layouts/brandx-layout/brandx-layout.component.ts` (+ `.html`, `.scss`).
- `src/app/layouts/layout.registry.ts` — `LAYOUT_REGISTRY`, `DEFAULT_LAYOUT`.
- `src/app/layouts/layout-host.component.ts` (+ `.html`).
- `src/app/layouts/layout-host.component.spec.ts`.

**Modificar:**
- `src/app/services/shared/token-storage.service.ts` — `setOrigin/getOrigin` + `ORIGIN_KEY` + limpieza en `clearToken`.
- `src/app/resolvers/auth-by-token.resolver.ts` — leer claim `origin` y llamar `applyFromOrigin`.
- `src/app/resolvers/auth-by-token.resolver.spec.ts` — crear si no existe.
- `src/app/app.component.ts` + `src/app/app.component.html` — usar `<app-layout-host>`.
- `src/app/app.component.spec.ts` — corregir test roto (`h1 Hello`) y validar layout-host.
- `src/app/app.config.ts` — registrar `provideAppInitializer` del tema.
- `src/styles.scss` — importar `theme.tokens.scss` y usar variables en body/base.

---

### Task 1: `ThemeConfig` y configs de temas

**Files:**
- Create: `src/app/theme/theme-config.ts`
- Create: `src/app/theme/themes/default.theme.ts`
- Create: `src/app/theme/themes/brandx.theme.ts`

- [ ] **Step 1: Crear la interface `ThemeConfig`**

`src/app/theme/theme-config.ts`:

```ts
export interface ThemeConfig {
  /** Clave que matchea el claim `origin` del JWT, normalizada (minúsculas/trim). */
  origin: string;
  /** Clave del shell a usar (ver LAYOUT_REGISTRY). */
  layoutKey: string;
  /** Overrides de variables CSS aplicadas en runtime sobre :root. */
  cssVars: Record<string, string>;
  logoUrl?: string;
  brandName?: string;
}
```

- [ ] **Step 2: Crear `DEFAULT_THEME`**

`src/app/theme/themes/default.theme.ts`:

```ts
import { ThemeConfig } from '../theme-config';

export const DEFAULT_THEME: ThemeConfig = {
  origin: 'default',
  layoutKey: 'default',
  cssVars: {},
  logoUrl: '/assets/brands/default/logo.svg',
  brandName: 'ADN Digital',
};
```

- [ ] **Step 3: Crear `BRANDX_THEME`**

`src/app/theme/themes/brandx.theme.ts`:

```ts
import { ThemeConfig } from '../theme-config';

export const BRANDX_THEME: ThemeConfig = {
  origin: 'brandx',
  layoutKey: 'brandx',
  cssVars: {
    '--color-primary': '#d6206e',
    '--color-accent': '#ff8a00',
  },
  logoUrl: '/assets/brands/brandx/logo.svg',
  brandName: 'Brand X',
};
```

- [ ] **Step 4: Commit**

```bash
git add src/app/theme/theme-config.ts src/app/theme/themes/
git commit -m "feat(theme): ThemeConfig y configs default/brandx"
```

---

### Task 2: `theme.registry.ts`

**Files:**
- Create: `src/app/theme/theme.registry.ts`

- [ ] **Step 1: Crear el registro de temas**

`src/app/theme/theme.registry.ts`:

```ts
import { ThemeConfig } from './theme-config';
import { DEFAULT_THEME } from './themes/default.theme';
import { BRANDX_THEME } from './themes/brandx.theme';

export const DEFAULT_ORIGIN = 'default';

export const THEME_REGISTRY: Record<string, ThemeConfig> = {
  [DEFAULT_THEME.origin]: DEFAULT_THEME,
  [BRANDX_THEME.origin]: BRANDX_THEME,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/theme/theme.registry.ts
git commit -m "feat(theme): registro de temas (THEME_REGISTRY)"
```

> El test de integridad del registro vive en Task 8 (cuando ya existe `LAYOUT_REGISTRY` para cruzar `layoutKey`).

---

### Task 3: `ThemeService`

**Files:**
- Create: `src/app/theme/theme.service.ts`
- Test: `src/app/theme/theme.service.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/app/theme/theme.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
import { DEFAULT_THEME } from './themes/default.theme';
import { BRANDX_THEME } from './themes/brandx.theme';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-origin');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-accent');
  });

  it('arranca con el tema default', () => {
    expect(service.active()).toBe(DEFAULT_THEME);
    expect(service.layoutKey()).toBe('default');
  });

  it('aplica un tema conocido y setea data-origin + cssVars', () => {
    service.applyFromOrigin('brandx');
    expect(service.active()).toBe(BRANDX_THEME);
    expect(service.layoutKey()).toBe('brandx');
    expect(document.documentElement.getAttribute('data-origin')).toBe('brandx');
    expect(document.documentElement.style.getPropertyValue('--color-primary').trim())
      .toBe('#d6206e');
  });

  it('cae a default cuando origin es null', () => {
    service.applyFromOrigin(null);
    expect(service.active()).toBe(DEFAULT_THEME);
    expect(document.documentElement.getAttribute('data-origin')).toBe('default');
  });

  it('cae a default cuando origin es desconocido', () => {
    service.applyFromOrigin('no-existe');
    expect(service.active()).toBe(DEFAULT_THEME);
  });

  it('normaliza el origin (trim + minúsculas)', () => {
    service.applyFromOrigin('  BrandX  ');
    expect(service.active()).toBe(BRANDX_THEME);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './theme.service'` / `ThemeService is not defined`.

- [ ] **Step 3: Implementar `ThemeService`**

`src/app/theme/theme.service.ts`:

```ts
import { Injectable, signal, computed } from '@angular/core';
import { ThemeConfig } from './theme-config';
import { THEME_REGISTRY, DEFAULT_ORIGIN } from './theme.registry';
import { DEFAULT_THEME } from './themes/default.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly active = signal<ThemeConfig>(DEFAULT_THEME);
  readonly layoutKey = computed(() => this.active().layoutKey);

  applyFromOrigin(origin: string | null): void {
    const key = origin?.trim().toLowerCase() || null;
    const theme = (key && THEME_REGISTRY[key]) || THEME_REGISTRY[DEFAULT_ORIGIN];
    if (key && !THEME_REGISTRY[key]) {
      console.warn(`[ThemeService] origin no registrado: "${origin}". Usando default.`);
    }
    this.active.set(theme);

    const root = document.documentElement;
    root.setAttribute('data-origin', theme.origin);
    Object.entries(theme.cssVars ?? {}).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (los 5 specs de `ThemeService`).

- [ ] **Step 5: Commit**

```bash
git add src/app/theme/theme.service.ts src/app/theme/theme.service.spec.ts
git commit -m "feat(theme): ThemeService con applyFromOrigin y fallback a default"
```

---

### Task 4: `TokenStorageService` — persistir `origin`

**Files:**
- Modify: `src/app/services/shared/token-storage.service.ts`
- Test: `src/app/services/shared/token-storage.service.spec.ts` (crear)

- [ ] **Step 1: Escribir el test que falla**

`src/app/services/shared/token-storage.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService — origin', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
    localStorage.clear();
  });

  it('guarda y lee el origin', () => {
    service.setOrigin('brandx');
    expect(service.getOrigin()).toBe('brandx');
  });

  it('getOrigin devuelve null si no hay nada', () => {
    expect(service.getOrigin()).toBeNull();
  });

  it('clearToken borra el origin', () => {
    service.setOrigin('brandx');
    service.clearToken();
    expect(service.getOrigin()).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `service.setOrigin is not a function`.

- [ ] **Step 3: Agregar la constante de clave**

En `src/app/services/shared/token-storage.service.ts`, junto a las demás `private static readonly *_KEY`, agregar:

```ts
  private static readonly ORIGIN_KEY = 'ORIGIN_KEY';
```

- [ ] **Step 4: Agregar `setOrigin`/`getOrigin`**

En la misma clase, después de `getAdvertiserName()`:

```ts
  /** Guarda el origin (quién consume el formulario) */
  setOrigin(origin: string): void {
    localStorage.setItem(TokenStorageService.ORIGIN_KEY, origin);
  }

  /** Lee el origin */
  getOrigin(): string | null {
    return localStorage.getItem(TokenStorageService.ORIGIN_KEY);
  }
```

- [ ] **Step 5: Borrar el origin en `clearToken`**

Dentro de `clearToken()`, agregar junto a los otros `removeItem`:

```ts
    localStorage.removeItem(TokenStorageService.ORIGIN_KEY);
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (3 specs de origin).

- [ ] **Step 7: Commit**

```bash
git add src/app/services/shared/token-storage.service.ts src/app/services/shared/token-storage.service.spec.ts
git commit -m "feat(theme): persistir origin en TokenStorageService"
```

---

### Task 5: Tokens CSS y wiring de `styles.scss`

**Files:**
- Create: `src/styles/theme.tokens.scss`
- Modify: `src/styles.scss`

- [ ] **Step 1: Crear el contrato de tokens**

`src/styles/theme.tokens.scss`:

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
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;

  /* Forma / superficie */
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

- [ ] **Step 2: Importar los tokens y usar variables en `styles.scss`**

En `src/styles.scss`, agregar el `@use` al inicio (junto a los otros `@use`):

```scss
@use './styles/theme.tokens.scss';
```

Luego reemplazar los valores hardcodeados del `body` y `:root` por las variables. Cambiar el bloque `body` (líneas ~44-53) por:

```scss
body {
  margin: 0;
  font-family: var(--font-family);
  background: radial-gradient(circle at 20% 20%, rgba(67, 56, 202, 0.05), transparent 28%),
    radial-gradient(circle at 80% 10%, rgba(14, 165, 233, 0.06), transparent 30%),
    var(--bg-app);
  min-height: 100vh;
  color: var(--text-base);
}
```

Y en el `:root` existente (líneas ~35-38) reemplazar `background-color: #f8fafc;` por:

```scss
  background-color: var(--bg-app);
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build exitoso, sin errores de SCSS.

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.tokens.scss src/styles.scss
git commit -m "feat(theme): tokens CSS en :root con overrides por data-origin"
```

---

### Task 6: `DefaultLayoutComponent`

**Files:**
- Create: `src/app/layouts/default-layout/default-layout.component.ts`
- Create: `src/app/layouts/default-layout/default-layout.component.html`
- Create: `src/app/layouts/default-layout/default-layout.component.scss`

- [ ] **Step 1: Crear el componente**

`src/app/layouts/default-layout/default-layout.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-default-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './default-layout.component.html',
  styleUrl: './default-layout.component.scss',
})
export class DefaultLayoutComponent {
  readonly theme = inject(ThemeService);
}
```

- [ ] **Step 2: Crear el template**

`src/app/layouts/default-layout/default-layout.component.html`:

```html
<div class="app-shell" data-layout="default">
  <main class="app-content">
    <router-outlet></router-outlet>
  </main>
</div>
```

> El default reproduce el chrome mínimo actual (`app-shell` + outlet) para no cambiar el comportamiento existente.

- [ ] **Step 3: Crear los estilos**

`src/app/layouts/default-layout/default-layout.component.scss`:

```scss
.app-shell {
  min-height: 100vh;
}
.app-content {
  min-height: 100vh;
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/app/layouts/default-layout/
git commit -m "feat(theme): DefaultLayoutComponent (shell default)"
```

---

### Task 7: `BrandXLayoutComponent`

**Files:**
- Create: `src/app/layouts/brandx-layout/brandx-layout.component.ts`
- Create: `src/app/layouts/brandx-layout/brandx-layout.component.html`
- Create: `src/app/layouts/brandx-layout/brandx-layout.component.scss`

- [ ] **Step 1: Crear el componente**

`src/app/layouts/brandx-layout/brandx-layout.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-brandx-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './brandx-layout.component.html',
  styleUrl: './brandx-layout.component.scss',
})
export class BrandXLayoutComponent {
  readonly theme = inject(ThemeService);
}
```

- [ ] **Step 2: Crear el template**

`src/app/layouts/brandx-layout/brandx-layout.component.html`:

```html
<div class="brandx-shell" data-layout="brandx">
  <header class="brandx-header">
    <img class="brandx-logo" [src]="theme.active().logoUrl" [alt]="theme.active().brandName" />
  </header>
  <main class="brandx-content">
    <router-outlet></router-outlet>
  </main>
</div>
```

- [ ] **Step 3: Crear los estilos**

`src/app/layouts/brandx-layout/brandx-layout.component.scss`:

```scss
.brandx-shell {
  min-height: 100vh;
}
.brandx-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}
.brandx-logo {
  height: var(--logo-height);
}
.brandx-content {
  padding: 1.5rem;
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
git add src/app/layouts/brandx-layout/
git commit -m "feat(theme): BrandXLayoutComponent (shell de ejemplo por origin)"
```

---

### Task 8: `layout.registry.ts` + test de integridad de registros

**Files:**
- Create: `src/app/layouts/layout.registry.ts`
- Test: `src/app/theme/theme.registry.spec.ts`

- [ ] **Step 1: Crear el registro de layouts**

`src/app/layouts/layout.registry.ts`:

```ts
import { Type } from '@angular/core';
import { DefaultLayoutComponent } from './default-layout/default-layout.component';
import { BrandXLayoutComponent } from './brandx-layout/brandx-layout.component';

export const DEFAULT_LAYOUT: Type<unknown> = DefaultLayoutComponent;

export const LAYOUT_REGISTRY: Record<string, Type<unknown>> = {
  default: DefaultLayoutComponent,
  brandx: BrandXLayoutComponent,
};
```

- [ ] **Step 2: Escribir el test de integridad que falla**

`src/app/theme/theme.registry.spec.ts`:

```ts
import { THEME_REGISTRY, DEFAULT_ORIGIN } from './theme.registry';
import { LAYOUT_REGISTRY } from '../layouts/layout.registry';

describe('THEME_REGISTRY (integridad)', () => {
  it('contiene el origin default', () => {
    expect(THEME_REGISTRY[DEFAULT_ORIGIN]).toBeDefined();
  });

  it('cada tema apunta a un layoutKey existente en LAYOUT_REGISTRY', () => {
    Object.values(THEME_REGISTRY).forEach((theme) => {
      expect(LAYOUT_REGISTRY[theme.layoutKey])
        .withContext(`layoutKey "${theme.layoutKey}" del origin "${theme.origin}"`)
        .toBeDefined();
    });
  });

  it('la clave del mapa coincide con el campo origin del tema', () => {
    Object.entries(THEME_REGISTRY).forEach(([key, theme]) => {
      expect(theme.origin).toBe(key);
    });
  });

  it('LAYOUT_REGISTRY contiene la entrada default', () => {
    expect(LAYOUT_REGISTRY['default']).toBeDefined();
  });
});
```

- [ ] **Step 3: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (4 specs de integridad). Si falla, hay desalineación entre registros — corregir el `layoutKey`/`origin`.

- [ ] **Step 4: Commit**

```bash
git add src/app/layouts/layout.registry.ts src/app/theme/theme.registry.spec.ts
git commit -m "feat(theme): LAYOUT_REGISTRY + test de integridad de registros"
```

---

### Task 9: `LayoutHostComponent`

**Files:**
- Create: `src/app/layouts/layout-host.component.ts`
- Create: `src/app/layouts/layout-host.component.html`
- Test: `src/app/layouts/layout-host.component.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/app/layouts/layout-host.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LayoutHostComponent } from './layout-host.component';
import { ThemeService } from '../theme/theme.service';

describe('LayoutHostComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [LayoutHostComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(LayoutHostComponent);
    const theme = TestBed.inject(ThemeService);
    return { fixture, theme };
  }

  it('renderiza el shell default cuando layoutKey es default', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-layout="default"]')).toBeTruthy();
  });

  it('renderiza el shell de brandx cuando se aplica ese origin', () => {
    const { fixture, theme } = setup();
    theme.applyFromOrigin('brandx');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-layout="brandx"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-layout="default"]')).toBeFalsy();
  });

  it('cae al layout default cuando el layoutKey no existe en el registro', () => {
    const { fixture, theme } = setup();
    // active() es una signal; forzamos un layoutKey inexistente
    theme.active.set({ origin: 'x', layoutKey: 'no-existe', cssVars: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-layout="default"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './layout-host.component'`.

- [ ] **Step 3: Implementar el componente**

`src/app/layouts/layout-host.component.ts`:

```ts
import { Component, computed, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ThemeService } from '../theme/theme.service';
import { LAYOUT_REGISTRY, DEFAULT_LAYOUT } from './layout.registry';

@Component({
  selector: 'app-layout-host',
  standalone: true,
  imports: [NgComponentOutlet],
  templateUrl: './layout-host.component.html',
})
export class LayoutHostComponent {
  private readonly theme = inject(ThemeService);

  readonly currentLayout = computed(
    () => LAYOUT_REGISTRY[this.theme.layoutKey()] ?? DEFAULT_LAYOUT,
  );
}
```

- [ ] **Step 4: Implementar el template**

`src/app/layouts/layout-host.component.html`:

```html
<ng-container *ngComponentOutlet="currentLayout()"></ng-container>
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (3 specs de `LayoutHostComponent`).

- [ ] **Step 6: Commit**

```bash
git add src/app/layouts/layout-host.component.ts src/app/layouts/layout-host.component.html src/app/layouts/layout-host.component.spec.ts
git commit -m "feat(theme): LayoutHostComponent renderiza el shell por origin"
```

---

### Task 10: Montar `LayoutHost` en `AppComponent`

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.spec.ts`

- [ ] **Step 1: Actualizar el spec roto y agregar la verificación del host**

Reemplazar TODO el contenido de `src/app/app.component.spec.ts` por:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza el layout-host', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-layout-host')).toBeTruthy();
  });
});
```

> Nota: el spec original tenía un test (`should render title`) que esperaba un `<h1>` con "Hello..." que no existe en el template real; por eso se reemplaza el archivo completo.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — no existe `app-layout-host` en el template.

- [ ] **Step 3: Actualizar `app.component.ts`**

`src/app/app.component.ts`:

```ts
import { Component } from '@angular/core';
import { LayoutHostComponent } from './layouts/layout-host.component';

@Component({
  selector: 'app-root',
  imports: [LayoutHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'formularios-dinamicos-angular-20';
}
```

- [ ] **Step 4: Actualizar `app.component.html`**

`src/app/app.component.html`:

```html
<app-layout-host></app-layout-host>
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (2 specs de `AppComponent`).

- [ ] **Step 6: Commit**

```bash
git add src/app/app.component.ts src/app/app.component.html src/app/app.component.spec.ts
git commit -m "feat(theme): AppComponent monta LayoutHost en lugar del router-outlet directo"
```

---

### Task 11: Leer el claim `origin` en el resolver

**Files:**
- Modify: `src/app/resolvers/auth-by-token.resolver.ts`
- Test: `src/app/resolvers/auth-by-token.resolver.spec.ts` (crear)

- [ ] **Step 1: Escribir el test que falla**

`src/app/resolvers/auth-by-token.resolver.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { authByTokenResolver } from './auth-by-token.resolver';
import { AuthService } from '../services/Auth.service';
import { TokenStorageService } from '../services/shared/token-storage.service';
import { ThemeService } from '../theme/theme.service';

/** Construye un JWT de prueba (header.payload.signature) con el payload dado. */
function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => btoa(JSON.stringify(obj));
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

function routeWithToken(token: string): ActivatedRouteSnapshot {
  return {
    queryParamMap: convertToParamMap({ token }),
    paramMap: convertToParamMap({}),
    url: [],
  } as unknown as ActivatedRouteSnapshot;
}

describe('authByTokenResolver — origin', () => {
  let theme: jasmine.SpyObj<ThemeService>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    theme = jasmine.createSpyObj<ThemeService>('ThemeService', ['applyFromOrigin']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['loginByToken']);
    TestBed.configureTestingModule({
      providers: [
        TokenStorageService,
        { provide: ThemeService, useValue: theme },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: { navigateByUrl: () => {} } },
      ],
    });
    localStorage.clear();
  });

  it('aplica y persiste el origin cuando el JWT lo trae', (done) => {
    const bearer = makeJwt({ 'bcm.origin': 'brandx' });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));
    const storage = TestBed.inject(TokenStorageService);

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.applyFromOrigin).toHaveBeenCalledWith('brandx');
        expect(storage.getOrigin()).toBe('brandx');
        done();
      });
    });
  });

  it('aplica default (null) cuando el JWT no trae origin', (done) => {
    const bearer = makeJwt({ 'bcm.advertiser_id': 1 });
    auth.loginByToken.and.returnValue(of({ bearerToken: bearer } as any));

    TestBed.runInInjectionContext(() => {
      (authByTokenResolver(routeWithToken('t'), {} as any) as any).subscribe(() => {
        expect(theme.applyFromOrigin).toHaveBeenCalledWith(null);
        done();
      });
    });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `applyFromOrigin` no es llamado (el resolver aún no lee origin).

- [ ] **Step 3: Modificar el resolver**

En `src/app/resolvers/auth-by-token.resolver.ts`, agregar el import:

```ts
import { ThemeService } from '../theme/theme.service';
```

Inyectar el servicio junto a los demás `inject(...)`:

```ts
    const theme = inject(ThemeService);
```

Dentro del `tap(res => { ... })`, después del bloque que setea el role, agregar:

```ts
            const origin = payload?.['bcm.origin'] ?? payload?.['origin'] ?? null;
            if (origin != null) storage.setOrigin(String(origin));
            theme.applyFromOrigin(origin != null ? String(origin) : null);
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (2 specs del resolver).

- [ ] **Step 5: Commit**

```bash
git add src/app/resolvers/auth-by-token.resolver.ts src/app/resolvers/auth-by-token.resolver.spec.ts
git commit -m "feat(theme): leer claim origin en el resolver y aplicar tema"
```

---

### Task 12: Reaplicar el tema al arrancar (`provideAppInitializer`)

**Files:**
- Create: `src/app/theme/theme.initializer.ts`
- Test: `src/app/theme/theme.initializer.spec.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Escribir el test que falla**

`src/app/theme/theme.initializer.spec.ts`:

```ts
import { applyStoredTheme } from './theme.initializer';
import { ThemeService } from './theme.service';
import { TokenStorageService } from '../services/shared/token-storage.service';

describe('applyStoredTheme', () => {
  let theme: jasmine.SpyObj<ThemeService>;
  let storage: jasmine.SpyObj<TokenStorageService>;

  beforeEach(() => {
    theme = jasmine.createSpyObj<ThemeService>('ThemeService', ['applyFromOrigin']);
    storage = jasmine.createSpyObj<TokenStorageService>('TokenStorageService', ['getOrigin']);
  });

  it('reaplica el origin guardado', () => {
    storage.getOrigin.and.returnValue('brandx');
    applyStoredTheme(theme, storage);
    expect(theme.applyFromOrigin).toHaveBeenCalledWith('brandx');
  });

  it('aplica default (null) cuando no hay origin guardado', () => {
    storage.getOrigin.and.returnValue(null);
    applyStoredTheme(theme, storage);
    expect(theme.applyFromOrigin).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL — `Cannot find module './theme.initializer'`.

- [ ] **Step 3: Implementar el initializer**

`src/app/theme/theme.initializer.ts`:

```ts
import { inject } from '@angular/core';
import { ThemeService } from './theme.service';
import { TokenStorageService } from '../services/shared/token-storage.service';

/** Reaplica el tema desde el origin persistido (recargas / arranque directo). */
export function applyStoredTheme(theme: ThemeService, storage: TokenStorageService): void {
  theme.applyFromOrigin(storage.getOrigin());
}

/** Factory para provideAppInitializer: resuelve dependencias vía inject(). */
export function themeInitializer(): void {
  applyStoredTheme(inject(ThemeService), inject(TokenStorageService));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (2 specs del initializer).

- [ ] **Step 5: Registrar el initializer en `app.config.ts`**

En `src/app/app.config.ts`, agregar el import:

```ts
import { provideAppInitializer } from '@angular/core';
import { themeInitializer } from './theme/theme.initializer';
```

Agregar al array `providers` (al final):

```ts
    provideAppInitializer(themeInitializer),
```

- [ ] **Step 6: Verificar build y suite completa**

Run: `npm run build && npm test -- --watch=false --browsers=ChromeHeadless`
Expected: build exitoso y toda la suite en PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/theme/theme.initializer.ts src/app/theme/theme.initializer.spec.ts src/app/app.config.ts
git commit -m "feat(theme): reaplicar tema al arrancar via provideAppInitializer"
```

---

## Verificación final

- [ ] `npm run build` exitoso.
- [ ] `npm test -- --watch=false --browsers=ChromeHeadless` con toda la suite en verde.
- [ ] Smoke manual: abrir un negocio con un token cuyo JWT tenga `bcm.origin=brandx` → se ve el shell de Brand X y `<html data-origin="brandx">`. Con un token sin `origin` (o desconocido) → diseño default.

## Notas para quien agregue marcas después

- **Marca nueva que reusa una estructura existente:** crear `src/app/theme/themes/<marca>.theme.ts` con `layoutKey` apuntando a un layout ya existente, registrarla en `THEME_REGISTRY`, y (opcional) agregar overrides en `theme.tokens.scss` bajo `[data-origin='<marca>']`. Sin tocar componentes.
- **Marca nueva con estructura propia:** además, crear el componente de layout en `src/app/layouts/<marca>-layout/`, registrarlo en `LAYOUT_REGISTRY`, y usar ese `layoutKey` en la config. El test de integridad (Task 8) valida que todo `layoutKey` exista.
- **Confirmar el nombre del claim** (`bcm.origin` vs otro) contra un token real; el resolver ya tolera `bcm.origin` y `origin`.
