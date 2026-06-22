# SACOM Form Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando el token trae `origin=SACOM`, renderizar el formulario de negocio (alta y edición) con el look SACOM y como wizard (un bloque dinámico por paso), full-screen, solo en la ruta del formulario.

**Architecture:** Se separa la *marca de sesión* (`sessionOrigin`, del token) del *tema efectivo* (calculado por ruta). Un `ThemeRouteBinder` aplica el tema SACOM solo en rutas marcadas `data.brandable`. Se agrega un layout/tema `sacom` a los registries existentes. El render de campos de un bloque se extrae a `BlockFieldsComponent` reutilizable; `DynamicFormComponent` gana una variante `stepper` para SACOM.

**Tech Stack:** Angular 20 (standalone components, signals), Reactive Forms, SCSS, Karma + Jasmine.

## Global Constraints

- **Trigger normalizado:** `origin` se compara en minúsculas/trim; la clave de marca es `sacom`. Copia verbatim del spec §2.
- **Scope:** SACOM aplica SOLO en la ruta `/:idClient/:businessId`. Lista y demás rutas quedan default. Spec §2.
- **No overlay:** de este lado NO hay backdrop/drawer/animación; el host lo embebe en `<iframe>`. Spec §2.3.
- **Sin header de página en SACOM:** se oculta `<header class="page__header">` y `.page__actions`. Spec §2.4.
- **Avance gateado:** "Siguiente" no avanza si el sub-FormGroup del bloque actual es inválido. Spec §2.6.
- **Preservar** tipos de campo, validación, guardado (bloque/avance/finalizar), `readOnly`, modal copiar bloque. Spec §2.7.
- **Tokens SACOM:** primario `#FFD800`, botón acción negro `#1A1A1A`, fuente `Inter`, fondo `#F4F4F4`, texto `#1A1A1A`, borde `#E5E5E5`, radios full/lg/md. Spec §7.
- **Comando de test:** `npx ng test --watch=false --browsers=ChromeHeadless`. Si ChromeHeadless no está disponible, usar `--browsers=Chrome`.
- **Build de verificación:** `npx ng build`.

---

## File Structure

**Nuevos:**
- `src/app/theme/themes/sacom.theme.ts` — `SACOM_THEME: ThemeConfig` (origin `sacom`, layoutKey `sacom`, cssVars).
- `src/app/layouts/sacom-layout/sacom-layout.component.ts|html|scss` — shell full-screen, sin header, con `<router-outlet>`.
- `src/app/theme/theme-route-binder.ts` — `ThemeRouteBinder` service.
- `src/app/dynamic-form/block-fields/block-fields.component.ts|html` — render de campos de un bloque (presentacional).
- Specs correspondientes a cada uno.

**Modificados:**
- `src/app/theme/theme.service.ts` — `sessionOrigin` signal.
- `src/app/theme/theme.registry.ts` — registrar `sacom`.
- `src/app/layouts/layout.registry.ts` — registrar `sacom`.
- `src/app/resolvers/auth-by-token.resolver.ts` — setear `sessionOrigin`, no aplicar global.
- `src/app/theme/theme.initializer.ts` — sembrar `sessionOrigin`.
- `src/app/app.routes.ts` — `data: { brandable: true }` en la ruta del form.
- `src/app/app.component.ts` — arrancar el binder.
- `src/app/business-form/business-form.component.ts|html|scss` — modo SACOM (ocultar header, full-screen).
- `src/app/dynamic-form/dynamic-form.component.ts|html` — variante stepper + usar `BlockFieldsComponent` + ocultar sidebar en SACOM.
- `src/app/layouts/layout-host.integration.spec.ts`, `src/app/theme/theme.service.spec.ts` — ajustes al modelo route-aware.

---

## Task 1: Tema y layout SACOM registrados

**Files:**
- Create: `src/app/theme/themes/sacom.theme.ts`
- Create: `src/app/layouts/sacom-layout/sacom-layout.component.ts`
- Create: `src/app/layouts/sacom-layout/sacom-layout.component.html`
- Create: `src/app/layouts/sacom-layout/sacom-layout.component.scss`
- Modify: `src/app/theme/theme.registry.ts`
- Modify: `src/app/layouts/layout.registry.ts`
- Test: `src/app/theme/themes/sacom.theme.spec.ts`

**Interfaces:**
- Consumes: `ThemeConfig` de `src/app/theme/theme-config.ts`; `THEME_REGISTRY`/`DEFAULT_ORIGIN` de `theme.registry.ts`; `LAYOUT_REGISTRY` de `layout.registry.ts`.
- Produces: `SACOM_THEME: ThemeConfig` (origin `'sacom'`, layoutKey `'sacom'`); `SacomLayoutComponent`; entradas `THEME_REGISTRY['sacom']` y `LAYOUT_REGISTRY['sacom']`.

- [ ] **Step 1: Escribir el test del tema**

Crear `src/app/theme/themes/sacom.theme.spec.ts`:

```ts
import { SACOM_THEME } from './sacom.theme';
import { THEME_REGISTRY } from '../theme.registry';
import { LAYOUT_REGISTRY } from '../../layouts/layout.registry';

describe('SACOM_THEME', () => {
  it('tiene origin y layoutKey "sacom"', () => {
    expect(SACOM_THEME.origin).toBe('sacom');
    expect(SACOM_THEME.layoutKey).toBe('sacom');
  });

  it('define el token primario amarillo y la fuente Inter', () => {
    expect(SACOM_THEME.cssVars['--color-primary']).toBe('#FFD800');
    expect(SACOM_THEME.cssVars['--font-family']).toContain('Inter');
  });

  it('está registrado en THEME_REGISTRY y LAYOUT_REGISTRY bajo "sacom"', () => {
    expect(THEME_REGISTRY['sacom']).toBe(SACOM_THEME);
    expect(LAYOUT_REGISTRY['sacom']).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/sacom.theme.spec.ts'`
Expected: FAIL — `Cannot find module './sacom.theme'`.

- [ ] **Step 3: Crear el tema SACOM**

Crear `src/app/theme/themes/sacom.theme.ts`:

```ts
import { ThemeConfig } from '../theme-config';

export const SACOM_THEME: ThemeConfig = {
  origin: 'sacom',
  layoutKey: 'sacom',
  cssVars: {
    '--color-primary': '#FFD800',
    '--color-primary-dark': '#E5C200',
    '--color-primary-tint': '#FFFBEB',
    '--color-bg': '#F4F4F4',
    '--color-surface': '#FFFFFF',
    '--color-text': '#1A1A1A',
    '--color-text-light': '#666666',
    '--color-text-muted': '#767676',
    '--color-border': '#E5E5E5',
    '--color-action': '#1A1A1A',
    '--color-action-hover': '#2D2D2D',
    '--color-danger': '#DC2626',
    '--color-success': '#16A34A',
    '--color-hero-tint': '#FEF9C3',
    '--font-family': "'Inter', Arial, sans-serif",
    '--radius-md': '8px',
    '--radius-lg': '12px',
    '--radius-full': '9999px',
  },
  logoUrl: '/assets/brands/sacom/logo.svg',
  brandName: 'SACOM',
};
```

- [ ] **Step 4: Crear el layout SACOM (full-screen, sin header)**

Crear `src/app/layouts/sacom-layout/sacom-layout.component.ts`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-sacom-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './sacom-layout.component.html',
  styleUrl: './sacom-layout.component.scss',
})
export class SacomLayoutComponent {}
```

Crear `src/app/layouts/sacom-layout/sacom-layout.component.html`:

```html
<div class="sacom-shell" data-layout="sacom">
  <router-outlet></router-outlet>
</div>
```

Crear `src/app/layouts/sacom-layout/sacom-layout.component.scss`:

```scss
.sacom-shell {
  width: 100vw;
  min-height: 100vh;
  background: var(--color-bg, #f4f4f4);
  color: var(--color-text, #1a1a1a);
  font-family: var(--font-family, 'Inter', Arial, sans-serif);
}
```

- [ ] **Step 5: Registrar en los registries**

En `src/app/theme/theme.registry.ts`, importar y añadir la entrada:

```ts
import { ThemeConfig } from './theme-config';
import { DEFAULT_THEME } from './themes/default.theme';
import { BRANDX_THEME } from './themes/brandx.theme';
import { SACOM_THEME } from './themes/sacom.theme';

export const DEFAULT_ORIGIN = 'default';

export const THEME_REGISTRY: Record<string, ThemeConfig> = {
  [DEFAULT_THEME.origin]: DEFAULT_THEME,
  [BRANDX_THEME.origin]: BRANDX_THEME,
  [SACOM_THEME.origin]: SACOM_THEME,
};
```

En `src/app/layouts/layout.registry.ts`:

```ts
import { Type } from '@angular/core';
import { DefaultLayoutComponent } from './default-layout/default-layout.component';
import { BrandXLayoutComponent } from './brandx-layout/brandx-layout.component';
import { SacomLayoutComponent } from './sacom-layout/sacom-layout.component';

export const DEFAULT_LAYOUT: Type<unknown> = DefaultLayoutComponent;

export const LAYOUT_REGISTRY: Record<string, Type<unknown>> = {
  default: DefaultLayoutComponent,
  brandx: BrandXLayoutComponent,
  sacom: SacomLayoutComponent,
};
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/sacom.theme.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 7: Commit**

```bash
git add src/app/theme/themes/sacom.theme.ts src/app/theme/themes/sacom.theme.spec.ts \
  src/app/theme/theme.registry.ts src/app/layouts/sacom-layout src/app/layouts/layout.registry.ts
git commit -m "feat(theme): registrar tema y layout SACOM full-screen"
```

---

## Task 2: `ThemeService.sessionOrigin`

**Files:**
- Modify: `src/app/theme/theme.service.ts`
- Test: `src/app/theme/theme.service.spec.ts`

**Interfaces:**
- Consumes: `ThemeService` existente (`active`, `layoutKey`, `applyFromOrigin`).
- Produces: `theme.sessionOrigin: WritableSignal<string | null>` (default `null`).

- [ ] **Step 1: Escribir el test**

Añadir a `src/app/theme/theme.service.spec.ts` (dentro del `describe` existente; si no existe, crear el archivo con el `TestBed` estándar):

```ts
it('sessionOrigin arranca en null y es escribible', () => {
  const service = TestBed.inject(ThemeService);
  expect(service.sessionOrigin()).toBeNull();
  service.sessionOrigin.set('sacom');
  expect(service.sessionOrigin()).toBe('sacom');
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/theme.service.spec.ts'`
Expected: FAIL — `sessionOrigin` no existe en `ThemeService`.

- [ ] **Step 3: Implementar la señal**

En `src/app/theme/theme.service.ts`, dentro de la clase, justo después de `readonly layoutKey = ...`:

```ts
  /** Marca de la sesión leída del token; null = sin marca. La aplica el ThemeRouteBinder. */
  readonly sessionOrigin = signal<string | null>(null);
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/theme.service.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/theme/theme.service.ts src/app/theme/theme.service.spec.ts
git commit -m "feat(theme): agregar señal sessionOrigin al ThemeService"
```

---

## Task 3: `ThemeRouteBinder` (tema efectivo por ruta)

**Files:**
- Create: `src/app/theme/theme-route-binder.ts`
- Test: `src/app/theme/theme-route-binder.spec.ts`

**Interfaces:**
- Consumes: `ThemeService` (`sessionOrigin`, `applyFromOrigin`, `active`); `Router`, `NavigationEnd`, `ActivatedRouteSnapshot`; `THEME_REGISTRY`.
- Produces: `ThemeRouteBinder` con método `start(): void` que se suscribe a `Router.events` y aplica el tema efectivo. Lee `data.brandable` de la hoja de ruta activa.

- [ ] **Step 1: Escribir el test**

Crear `src/app/theme/theme-route-binder.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { ThemeService } from './theme.service';
import { ThemeRouteBinder } from './theme-route-binder';

@Component({ standalone: true, template: 'home' })
class HomeStub {}
@Component({ standalone: true, template: 'form' })
class FormStub {}

describe('ThemeRouteBinder', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'list', component: HomeStub },
          { path: 'form', component: FormStub, data: { brandable: true } },
        ]),
      ],
    });
    const router = TestBed.inject(Router);
    const theme = TestBed.inject(ThemeService);
    const binder = TestBed.inject(ThemeRouteBinder);
    binder.start();
    return { router, theme };
  }

  afterEach(() => {
    document.documentElement.removeAttribute('data-origin');
  });

  it('aplica el tema de sesión en una ruta brandable', async () => {
    const { router, theme } = await setup();
    theme.sessionOrigin.set('sacom');
    await router.navigateByUrl('/form');
    expect(theme.active().origin).toBe('sacom');
  });

  it('NO aplica el tema en una ruta no-brandable (queda default)', async () => {
    const { router, theme } = await setup();
    theme.sessionOrigin.set('sacom');
    await router.navigateByUrl('/list');
    expect(theme.active().origin).toBe('default');
  });

  it('limpia el tema al salir de la ruta brandable', async () => {
    const { router, theme } = await setup();
    theme.sessionOrigin.set('sacom');
    await router.navigateByUrl('/form');
    expect(theme.active().origin).toBe('sacom');
    await router.navigateByUrl('/list');
    expect(theme.active().origin).toBe('default');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/theme-route-binder.spec.ts'`
Expected: FAIL — `Cannot find module './theme-route-binder'`.

- [ ] **Step 3: Implementar el binder**

Crear `src/app/theme/theme-route-binder.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './theme.service';
import { THEME_REGISTRY } from './theme.registry';

/** Aplica el tema efectivo según la ruta: solo rutas con data.brandable usan sessionOrigin. */
@Injectable({ providedIn: 'root' })
export class ThemeRouteBinder {
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  start(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.apply());
  }

  private apply(): void {
    const brandable = this.isBrandable(this.router.routerState.snapshot.root);
    const origin = this.theme.sessionOrigin();
    const key = origin?.trim().toLowerCase() || null;

    if (brandable && key && THEME_REGISTRY[key]) {
      this.theme.applyFromOrigin(origin);
    } else {
      this.theme.applyFromOrigin(null);
    }
  }

  private isBrandable(root: ActivatedRouteSnapshot): boolean {
    let node: ActivatedRouteSnapshot | null = root;
    while (node) {
      if (node.data?.['brandable'] === true) return true;
      node = node.firstChild;
    }
    return false;
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/theme-route-binder.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/theme/theme-route-binder.ts src/app/theme/theme-route-binder.spec.ts
git commit -m "feat(theme): ThemeRouteBinder aplica tema solo en rutas brandable"
```

---

## Task 4: Cablear resolver, initializer, ruta y arranque del binder

**Files:**
- Modify: `src/app/resolvers/auth-by-token.resolver.ts:40-42`
- Modify: `src/app/theme/theme.initializer.ts`
- Modify: `src/app/app.routes.ts:16`
- Modify: `src/app/app.component.ts`
- Modify: `src/app/resolvers/auth-by-token.resolver.spec.ts` (ajuste)
- Modify: `src/app/theme/theme.initializer.spec.ts` (ajuste)

**Interfaces:**
- Consumes: `ThemeService.sessionOrigin` (Task 2), `ThemeRouteBinder.start()` (Task 3).
- Produces: el resolver setea `sessionOrigin`; el initializer la siembra; la ruta del form lleva `data: { brandable: true }`; `AppComponent` arranca el binder.

- [ ] **Step 1: Resolver — setear sessionOrigin en vez de aplicar tema global**

En `src/app/resolvers/auth-by-token.resolver.ts`, reemplazar las líneas 40-42:

```ts
            const origin = payload?.['bcm.origin'] ?? payload?.['origin'] ?? null;
            if (origin != null) storage.setOrigin(String(origin));
            theme.sessionOrigin.set(origin != null ? String(origin) : null);
```

(Se elimina la llamada `theme.applyFromOrigin(...)`; el binder la hará por ruta. `theme` ya está inyectado en el resolver.)

- [ ] **Step 2: Initializer — sembrar sessionOrigin desde storage**

Reemplazar el cuerpo de `src/app/theme/theme.initializer.ts`:

```ts
import { inject } from '@angular/core';
import { ThemeService } from './theme.service';
import { TokenStorageService } from '../services/shared/token-storage.service';

/** Siembra la marca de sesión desde el origin persistido (recargas / arranque directo). */
export function applyStoredTheme(theme: ThemeService, storage: TokenStorageService): void {
  theme.sessionOrigin.set(storage.getOrigin());
}

/** Factory para provideAppInitializer: resuelve dependencias vía inject(). */
export function themeInitializer(): void {
  applyStoredTheme(inject(ThemeService), inject(TokenStorageService));
}
```

- [ ] **Step 3: Ruta del form — marcar brandable**

En `src/app/app.routes.ts`, línea de la ruta del formulario:

```ts
  { path: ':idClient/:businessId', component: BusinessFormComponent, resolve: { authReady: authByTokenResolver }, data: { brandable: true } },
```

- [ ] **Step 4: AppComponent — arrancar el binder**

Reemplazar `src/app/app.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { LayoutHostComponent } from './layouts/layout-host.component';
import { ThemeRouteBinder } from './theme/theme-route-binder';

@Component({
  selector: 'app-root',
  imports: [LayoutHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'formularios-dinamicos-angular-20';

  constructor() {
    inject(ThemeRouteBinder).start();
  }
}
```

- [ ] **Step 5: Ajustar specs existentes que asumían apply global**

En `src/app/theme/theme.initializer.spec.ts`, cambiar las aserciones que esperaban `applyFromOrigin` por la nueva semántica de `sessionOrigin`. Patrón esperado:

```ts
it('siembra sessionOrigin desde el storage', () => {
  const storage = { getOrigin: () => 'sacom' } as any;
  const theme = TestBed.inject(ThemeService);
  applyStoredTheme(theme, storage);
  expect(theme.sessionOrigin()).toBe('sacom');
});
```

En `src/app/resolvers/auth-by-token.resolver.spec.ts`, donde se verificaba `applyFromOrigin`, cambiar a verificar `theme.sessionOrigin.set` (o el valor final de `sessionOrigin`). Si el spec usaba un spy de `applyFromOrigin` para el origin, reemplazarlo por un spy/lectura de `sessionOrigin`.

- [ ] **Step 6: Correr los specs tocados y el build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/theme.initializer.spec.ts' --include='**/auth-by-token.resolver.spec.ts'`
Expected: PASS.

Run: `npx ng build`
Expected: build sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/app/resolvers/auth-by-token.resolver.ts src/app/theme/theme.initializer.ts \
  src/app/app.routes.ts src/app/app.component.ts \
  src/app/theme/theme.initializer.spec.ts src/app/resolvers/auth-by-token.resolver.spec.ts
git commit -m "feat(theme): cablear sessionOrigin route-aware (resolver, initializer, binder)"
```

---

## Task 5: Extraer `BlockFieldsComponent`

**Files:**
- Create: `src/app/dynamic-form/block-fields/block-fields.component.ts`
- Create: `src/app/dynamic-form/block-fields/block-fields.component.html`
- Modify: `src/app/dynamic-form/dynamic-form.component.ts` (imports + plantilla)
- Modify: `src/app/dynamic-form/dynamic-form.component.html:47-136`
- Test: `src/app/dynamic-form/block-fields/block-fields.component.spec.ts`

**Interfaces:**
- Consumes: `BlockView` de `../services/block-factory.service`; `OptionItemInterface` de `../interface/OptionItem.intreface`; `getControl`, `getFieldOptions` de `../../utils`; todos los `Field*Component` de `../../components`.
- Produces: `BlockFieldsComponent` con:
  - `@Input({required:true}) block!: BlockView`
  - `@Input({required:true}) group!: FormGroup` (sub-FormGroup del bloque)
  - `@Input() optionsMap: Record<string, OptionItemInterface[]> = {}`
  - `@Input() readOnly = false`
  - helpers internos: `ctrl(name)`, `arr(name)`, `opts(name)`.

- [ ] **Step 1: Escribir el test**

Crear `src/app/dynamic-form/block-fields/block-fields.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BlockFieldsComponent } from './block-fields.component';

describe('BlockFieldsComponent', () => {
  let fixture: ComponentFixture<BlockFieldsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BlockFieldsComponent] });
    fixture = TestBed.createComponent(BlockFieldsComponent);
  });

  it('renderiza un input de texto para un campo default', () => {
    fixture.componentInstance.group = new FormGroup({ nombre: new FormControl('') });
    fixture.componentInstance.block = {
      code: 'b1',
      title: 'Bloque',
      rows: [{ num: 1, fields: [{ name: 'nombre', displayType: 'text', colSpan: 12 }] }],
    } as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-field-input')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/block-fields.component.spec.ts'`
Expected: FAIL — `Cannot find module './block-fields.component'`.

- [ ] **Step 3: Crear el componente TS**

Crear `src/app/dynamic-form/block-fields/block-fields.component.ts`:

```ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { getControl, getFieldOptions } from '../../utils';
import { OptionItemInterface } from '../interface/OptionItem.intreface';
import { BlockView } from '../services/block-factory.service';
import {
  FieldArrayObjectComponent,
  FieldArrayPrimitiveComponent,
  FieldFileComponent,
  FieldInputComponent,
  FieldUrlComponent,
  FieldPhoneComponent,
  FieldDomainOptionComponent,
  FieldOpeningHoursComponent,
  FieldOpeningHoursFlexibleComponent,
  FieldLocationMapComponent,
  FieldPillMultiselectComponent,
  FieldProductosServiciosComponent,
  FieldMultiselectComponent,
  FieldSelectComponent,
  FieldTextareaComponent,
} from '../../components';

@Component({
  selector: 'app-block-fields',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FieldInputComponent,
    FieldUrlComponent,
    FieldTextareaComponent,
    FieldSelectComponent,
    FieldMultiselectComponent,
    FieldFileComponent,
    FieldDomainOptionComponent,
    FieldLocationMapComponent,
    FieldPillMultiselectComponent,
    FieldProductosServiciosComponent,
    FieldArrayObjectComponent,
    FieldArrayPrimitiveComponent,
    FieldPhoneComponent,
    FieldOpeningHoursComponent,
    FieldOpeningHoursFlexibleComponent,
  ],
  templateUrl: './block-fields.component.html',
})
export class BlockFieldsComponent {
  @Input({ required: true }) block!: BlockView;
  @Input({ required: true }) group!: FormGroup;
  @Input() optionsMap: Record<string, OptionItemInterface[]> = {};
  @Input() readOnly = false;

  ctrl(name: string) {
    return getControl(this.group, [name]);
  }

  arr(name: string): FormArray {
    return this.group.get(name) as FormArray;
  }

  opts(name: string): OptionItemInterface[] {
    return getFieldOptions(this.optionsMap, this.block.code, name);
  }
}
```

- [ ] **Step 4: Crear la plantilla (mover el @switch existente)**

Crear `src/app/dynamic-form/block-fields/block-fields.component.html` con el contenido del `@switch` actual, adaptado a `group`/`ctrl`/`arr`/`opts`:

```html
<div class="section__content" [formGroup]="group">
  @for (row of block.rows; track row.num) {
  <div class="field-grid">
    @for (field of row.fields; track field.name) {
    <div class="field-col" [style.gridColumn]="'span ' + field.colSpan">
      @switch (field.displayType) {
      @case ('textarea') {
      <app-field-textarea [field]="field" [control]="ctrl(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('select') {
      <app-field-select [field]="field" [control]="ctrl(field.name)" [options]="opts(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('multiselect') {
      <app-field-multiselect [field]="field" [control]="ctrl(field.name)" [options]="opts(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('checkbox-grid') {
      <app-field-pill-multiselect [field]="field" [control]="ctrl(field.name)" [options]="opts(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('array-checkbox-grid') {
      <app-field-pill-multiselect [field]="field" [control]="ctrl(field.name)" [options]="opts(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('file') {
      <app-field-file [field]="field" [control]="ctrl(field.name)" [blockCode]="block.code" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('opening-hours') {
      <app-field-opening-hours [field]="field" [control]="ctrl(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('opening-hours-flexible') {
      <app-field-opening-hours-flexible [field]="field" [control]="ctrl(field.name)" [optionSets]="block.optionSets || {}" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('location-map') {
      <app-field-location-map [field]="field" [coordsControl]="ctrl(field.name)" [addressControl]="ctrl('direccion')" [blockName]="block.title" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('domain-option') {
      <app-field-domain-option [field]="field" [control]="ctrl(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('pill-multiselect') {
      <app-field-pill-multiselect [field]="field" [control]="ctrl(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('productos-servicios') {
      <app-field-productos-servicios [field]="field" [formArray]="arr(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('phones') {
      <app-field-phone [field]="field" [formArray]="arr(field.name)" [optionSets]="block.optionSets || {}" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('checkbox') {
      <app-field-input [field]="field" [control]="ctrl(field.name)" [countryControl]="field.countryControlName ? ctrl(field.countryControlName) : undefined" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('url') {
      <app-field-url [field]="field" [control]="ctrl(field.name)" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('array-object') {
      <app-field-array-object [field]="field" [formArray]="arr(field.name)" [optionSets]="block.optionSets || {}" [readOnly]="readOnly || block.readOnly" />
      }
      @case ('array-primitive') {
      <app-field-array-primitive [field]="field" [formArray]="arr(field.name)" [options]="opts(field.name)" [blockCode]="block.code" [readOnly]="readOnly || block.readOnly" />
      }
      @default {
      <app-field-input [field]="field" [control]="ctrl(field.name)" [countryControl]="field.countryControlName ? ctrl(field.countryControlName) : undefined" [readOnly]="readOnly || block.readOnly" />
      }
      }
    </div>
    }
  </div>
  }
</div>
```

- [ ] **Step 5: Usar `BlockFieldsComponent` en el acordeón default**

En `src/app/dynamic-form/dynamic-form.component.html`, reemplazar el bloque actual `<div class="section__content" [formGroupName]="block.code"> ... </div>` (líneas 47-136) por:

```html
        <app-block-fields
          [block]="block"
          [group]="getBlockGroup(block.code)"
          [optionsMap]="optionsMap"
          [readOnly]="readOnly"
        />
```

En `src/app/dynamic-form/dynamic-form.component.ts`:
- Importar y añadir `BlockFieldsComponent` al array `imports`.
- Quitar de `imports` los `Field*Component` que ya solo usaba ese switch **si dejan de usarse** (verificar con el build; si el acordeón ya no referencia ninguno directamente, se pueden quitar — pero NO es obligatorio para que compile).
- Añadir el helper:

```ts
  getBlockGroup(blockCode: string): FormGroup {
    return this.form.get(blockCode) as FormGroup;
  }
```

- [ ] **Step 6: Correr tests y build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/block-fields.component.spec.ts'`
Expected: PASS.

Run: `npx ng build`
Expected: build sin errores. (El acordeón default debe seguir renderizando los campos vía `app-block-fields`.)

- [ ] **Step 7: Commit**

```bash
git add src/app/dynamic-form/block-fields src/app/dynamic-form/dynamic-form.component.ts src/app/dynamic-form/dynamic-form.component.html
git commit -m "refactor(form): extraer BlockFieldsComponent reutilizable"
```

---

## Task 6: Variante stepper en `DynamicFormComponent`

**Files:**
- Modify: `src/app/dynamic-form/dynamic-form.component.ts`
- Modify: `src/app/dynamic-form/dynamic-form.component.html`
- Modify: `src/app/dynamic-form/dynamic-form.component.scss`
- Test: `src/app/dynamic-form/dynamic-form.stepper.spec.ts`

**Interfaces:**
- Consumes: `ThemeService.active` (Task 1/2), `BlockFieldsComponent` (Task 5), `form: FormGroup`, `blocks: BlockView[]`, métodos existentes `onFinalize`, `emitDraft`, `saveJustOneBlock`.
- Produces: en `DynamicFormComponent`:
  - `variant: Signal<'default' | 'sacom'>` = `computed(() => theme.active().origin === 'sacom' ? 'sacom' : 'default')`
  - `currentStep = signal(0)`, `nextStep()`, `prevStep()`, `isLastStep(): boolean`, `currentBlock(): BlockView | undefined`, `currentStepInvalid(): boolean`.

- [ ] **Step 1: Escribir el test**

Crear `src/app/dynamic-form/dynamic-form.stepper.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DynamicFormComponent } from './dynamic-form.component';
import { ThemeService } from '../theme/theme.service';
import { SACOM_THEME } from '../theme/themes/sacom.theme';

describe('DynamicFormComponent – stepper SACOM', () => {
  function make(): DynamicFormComponent {
    TestBed.configureTestingModule({ imports: [DynamicFormComponent] });
    const fixture = TestBed.createComponent(DynamicFormComponent);
    const cmp = fixture.componentInstance;
    cmp.blocks = [
      { code: 'b1', title: 'Uno', rows: [] } as any,
      { code: 'b2', title: 'Dos', rows: [] } as any,
    ];
    cmp.form = new FormGroup({
      b1: new FormGroup({ x: new FormControl('', Validators.required) }),
      b2: new FormGroup({ y: new FormControl('ok') }),
    });
    return cmp;
  }

  it('variant es "sacom" cuando el tema activo es sacom', () => {
    const cmp = make();
    TestBed.inject(ThemeService).active.set(SACOM_THEME);
    expect(cmp.variant()).toBe('sacom');
  });

  it('nextStep NO avanza si el bloque actual es inválido', () => {
    const cmp = make();
    expect(cmp.currentStep()).toBe(0);
    cmp.nextStep();
    expect(cmp.currentStep()).toBe(0);
  });

  it('nextStep avanza cuando el bloque actual es válido', () => {
    const cmp = make();
    (cmp.form.get('b1') as FormGroup).get('x')!.setValue('lleno');
    cmp.nextStep();
    expect(cmp.currentStep()).toBe(1);
  });

  it('prevStep retrocede libremente', () => {
    const cmp = make();
    (cmp.form.get('b1') as FormGroup).get('x')!.setValue('lleno');
    cmp.nextStep();
    cmp.prevStep();
    expect(cmp.currentStep()).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/dynamic-form.stepper.spec.ts'`
Expected: FAIL — `variant`/`nextStep` no existen.

- [ ] **Step 3: Implementar el estado del stepper en el TS**

En `src/app/dynamic-form/dynamic-form.component.ts`:
- Añadir imports: `computed`, `signal` de `@angular/core`; `ThemeService` de `../theme/theme.service`.
- Inyectar el tema y añadir el estado (después de las propiedades existentes):

```ts
  private readonly theme = inject(ThemeService);

  readonly variant = computed<'default' | 'sacom'>(() =>
    this.theme.active().origin === 'sacom' ? 'sacom' : 'default'
  );

  readonly currentStep = signal(0);

  currentBlock(): BlockView | undefined {
    return this.blocks[this.currentStep()];
  }

  isLastStep(): boolean {
    return this.currentStep() >= this.blocks.length - 1;
  }

  currentStepInvalid(): boolean {
    const block = this.currentBlock();
    if (!block) return false;
    const group = this.form.get(block.code);
    return !!group && group.invalid;
  }

  nextStep(): void {
    const block = this.currentBlock();
    const group = block ? (this.form.get(block.code) as FormGroup | null) : null;
    if (this.currentStepInvalid()) {
      group?.markAllAsTouched();
      return;
    }
    if (!this.isLastStep()) this.currentStep.set(this.currentStep() + 1);
  }

  prevStep(): void {
    if (this.currentStep() > 0) this.currentStep.set(this.currentStep() - 1);
  }
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/dynamic-form.stepper.spec.ts'`
Expected: PASS (4 specs).

- [ ] **Step 5: Plantilla — ramificar default vs stepper**

En `src/app/dynamic-form/dynamic-form.component.html`, envolver el contenido en una rama por `variant()`. La rama `default` es el `df-shell` actual. Añadir la rama `sacom`:

```html
@if (form) {
  @if (variant() === 'sacom') {
    <div class="sacom-wizard" data-origin="sacom">
      <form class="sacom-wizard__form" novalidate (ngSubmit)="onSubmit()" [formGroup]="form">
        <div class="sacom-steps">
          @for (block of blocks; track block.code; let i = $index) {
          <div class="sacom-step"
               [class.sacom-step--active]="currentStep() === i"
               [class.sacom-step--done]="currentStep() > i">{{ i + 1 }}</div>
          @if (i < blocks.length - 1) {
          <div class="sacom-step-line" [class.sacom-step-line--done]="currentStep() > i"></div>
          }
          }
        </div>

        @if (currentBlock(); as block) {
        <p class="sacom-step-label">Paso {{ currentStep() + 1 }} de {{ blocks.length }} — {{ block.title }}</p>
        <app-block-fields
          [block]="block"
          [group]="getBlockGroup(block.code)"
          [optionsMap]="optionsMap"
          [readOnly]="readOnly" />
        }

        @if (!formReadOnly) {
        <div class="sacom-actions">
          @if (currentStep() > 0) {
          <button type="button" class="sacom-btn sacom-btn--secondary" (click)="prevStep()">Atrás</button>
          }
          @if (!isLastStep()) {
          <button type="button" class="sacom-btn sacom-btn--primary" (click)="nextStep()">Siguiente</button>
          } @else {
          <button type="button" class="sacom-btn sacom-btn--secondary" (click)="emitDraft()">Guardar avance</button>
          @if (canFinalize) {
          <button type="button" class="sacom-btn sacom-btn--primary" (click)="onFinalize()">Finalizar</button>
          }
          }
        </div>
        }
      </form>
    </div>
  } @else {
    <!-- ... (todo el contenido actual del df-shell, sin cambios) ... -->
  }

  <app-copy-block-modal
    [visible]="copyModalVisible"
    [businesses]="copyModalBusinesses"
    [loading]="copyModalLoading"
    [currentBusinessId]="schema.businessId"
    (selectBusiness)="onCopyBusinessSelected($event)"
    (closeModal)="closeCopyModal()">
  </app-copy-block-modal>
}
```

Notas:
- Mover el `df-shell` actual (sidebar + acordeón) dentro de la rama `@else`. El `app-copy-block-modal` queda fuera de ambas ramas, compartido.
- Aprovechar para corregir el warning NG8107: cambiar `[currentBusinessId]="schema?.businessId"` por `[currentBusinessId]="schema.businessId"` (schema es `required`).

- [ ] **Step 6: Estilos del wizard (estructura, tokens vía vars)**

Añadir a `src/app/dynamic-form/dynamic-form.component.scss`:

```scss
.sacom-wizard {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 18px;
  font-family: var(--font-family, 'Inter', Arial, sans-serif);
  color: var(--color-text, #1a1a1a);
}
.sacom-steps { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
.sacom-step {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--color-bg, #f4f4f4); color: var(--color-text-muted, #767676);
  font-size: 10px; font-weight: 900;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  &--active { background: var(--color-primary, #ffd800); color: var(--color-text, #1a1a1a); }
  &--done { background: var(--color-text, #1a1a1a); color: var(--color-primary, #ffd800); }
}
.sacom-step-line { flex: 1; height: 2px; background: var(--color-border, #e5e5e5);
  &--done { background: var(--color-text, #1a1a1a); } }
.sacom-step-label { font-size: 11px; font-weight: 700; margin: 0 0 14px; }
.sacom-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
.sacom-btn {
  width: 100%; border: none; border-radius: var(--radius-full, 9999px);
  padding: 10px 24px; font-size: 13px; font-weight: 700; cursor: pointer;
  font-family: var(--font-family, 'Inter', Arial, sans-serif);
  &--primary { background: var(--color-action, #1a1a1a); color: #fff; &:hover { background: var(--color-action-hover, #2d2d2d); } }
  &--secondary { background: transparent; color: var(--color-text-light, #666);
    border: 1.5px solid var(--color-border, #e5e5e5); &:hover { background: var(--color-bg, #f4f4f4); } }
}
```

- [ ] **Step 7: Correr tests y build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/dynamic-form*.spec.ts'`
Expected: PASS.

Run: `npx ng build`
Expected: build sin errores ni warning NG8107.

- [ ] **Step 8: Commit**

```bash
git add src/app/dynamic-form/dynamic-form.component.ts src/app/dynamic-form/dynamic-form.component.html src/app/dynamic-form/dynamic-form.component.scss src/app/dynamic-form/dynamic-form.stepper.spec.ts
git commit -m "feat(form): variante stepper SACOM (un bloque por paso, avance gateado)"
```

---

## Task 7: `BusinessFormComponent` en modo SACOM (sin header, full-screen)

**Files:**
- Modify: `src/app/business-form/business-form.component.ts`
- Modify: `src/app/business-form/business-form.component.html`
- Modify: `src/app/business-form/business-form.component.scss`
- Test: `src/app/business-form/business-form.sacom.spec.ts`

**Interfaces:**
- Consumes: `ThemeService.active`.
- Produces: en `BusinessFormComponent`: `isSacom: Signal<boolean>` = `computed(() => theme.active().origin === 'sacom')`.

- [ ] **Step 1: Escribir el test**

Crear `src/app/business-form/business-form.sacom.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BusinessFormComponent } from './business-form.component';
import { ThemeService } from '../theme/theme.service';
import { SACOM_THEME } from '../theme/themes/sacom.theme';
import { DEFAULT_THEME } from '../theme/themes/default.theme';

describe('BusinessFormComponent – isSacom', () => {
  function make(): BusinessFormComponent {
    TestBed.configureTestingModule({
      imports: [BusinessFormComponent],
      providers: [provideRouter([])],
    });
    return TestBed.createComponent(BusinessFormComponent).componentInstance;
  }

  it('isSacom true con tema sacom', () => {
    const cmp = make();
    TestBed.inject(ThemeService).active.set(SACOM_THEME);
    expect(cmp.isSacom()).toBe(true);
  });

  it('isSacom false con tema default', () => {
    const cmp = make();
    TestBed.inject(ThemeService).active.set(DEFAULT_THEME);
    expect(cmp.isSacom()).toBe(false);
  });
});
```

> Nota: el constructor de `BusinessFormComponent` llama a `loadForm()`/`loadHeaderData()`, que usan `BusinessService`. Si el test falla por dependencias HTTP, añadir `provideHttpClient()` y `provideHttpClientTesting()` a los providers, o mockear `BusinessService` con un objeto cuyos métodos devuelven `of(null)`. Ajustar imports según el patrón ya usado en specs existentes del proyecto.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/business-form.sacom.spec.ts'`
Expected: FAIL — `isSacom` no existe.

- [ ] **Step 3: Implementar `isSacom`**

En `src/app/business-form/business-form.component.ts`:
- Importar `computed` de `@angular/core` y `ThemeService` de `../theme/theme.service`.
- Añadir:

```ts
  private readonly theme = inject(ThemeService);
  readonly isSacom = computed(() => this.theme.active().origin === 'sacom');
```

- [ ] **Step 4: Plantilla — ocultar header/back en SACOM**

En `src/app/business-form/business-form.component.html`, envolver `.page__actions` y `<header class="page__header">` con `@if (!isSacom()) { ... }`. La parte de `@if (formSchema$ | async; as schema)` con `<app-dynamic-form>` queda igual (el stepper lo decide `DynamicFormComponent`). Añadir clase condicional al `<section>`:

```html
<section class="page" [class.page--sacom]="isSacom()">
  @if (!isSacom()) {
  <div class="page__actions"> ... (igual) ... </div>
  <header class="page__header"> ... (igual) ... </header>
  }

  @if (formSchema$ | async; as schema) {
  <div class="card" [class.card--sacom]="isSacom()">
    <app-dynamic-form ... />
  </div>
  } @else {
  <p class="loading">Cargando esquema...</p>
  }
</section>
```

- [ ] **Step 5: Estilos full-screen SACOM**

Añadir a `src/app/business-form/business-form.component.scss`:

```scss
.page--sacom {
  max-width: none;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
.card--sacom {
  border: none;
  box-shadow: none;
  background: transparent;
  padding: 0;
}
```

- [ ] **Step 6: Correr test y build**

Run: `npx ng test --watch=false --browsers=ChromeHeadless --include='**/business-form.sacom.spec.ts'`
Expected: PASS.

Run: `npx ng build`
Expected: build sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/app/business-form/business-form.component.ts src/app/business-form/business-form.component.html src/app/business-form/business-form.component.scss src/app/business-form/business-form.sacom.spec.ts
git commit -m "feat(form): ocultar header y usar full-screen en modo SACOM"
```

---

## Task 8: Fuente Inter + re-skin de campos bajo SACOM

> **Riesgo principal (spec §8).** Es trabajo iterativo y visual, no totalmente unit-testeable. Abordar tipo por tipo y verificar en el navegador con un token `origin=SACOM`.

**Files:**
- Modify: `src/index.html` (o `src/styles.scss`) — cargar fuente Inter.
- Create/Modify: `src/styles.scss` (o un parcial `src/styles/_sacom.scss` importado) — overrides scoped `[data-origin="sacom"]`.
- Modify: estilos de los componentes de campo solo si el override global no basta.

**Interfaces:**
- Consumes: `--color-*`, `--font-family`, `--radius-*` que aplica `SACOM_THEME` sobre `:root` y el atributo `data-origin="sacom"` que pone `applyFromOrigin`.
- Produces: estilos visuales SACOM para inputs, labels, selects, textarea, file, etc.

- [ ] **Step 1: Cargar la fuente Inter**

En `src/index.html`, dentro de `<head>`, añadir:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
```

(Si el proyecto sirve fuentes localmente, copiar las de `SACOM-modulo-free-account/src/assets/fonts` a `public/fonts` y declarar `@font-face` en su lugar.)

- [ ] **Step 2: Overrides globales scoped a SACOM**

Crear `src/styles/_sacom.scss` (e importarlo desde `src/styles.scss` con `@use './styles/sacom';`). Estos overrides solo aplican cuando `:root` tiene `data-origin="sacom"`:

```scss
:root[data-origin='sacom'] {
  // Inputs estilo drawer
  input[type='text'], input[type='email'], input[type='tel'],
  input[type='url'], input[type='number'], select, textarea {
    border: 1.5px solid var(--color-border, #e5e5e5);
    border-radius: var(--radius-md, 8px);
    font-family: var(--font-family, 'Inter');
    font-size: 12px;
    outline: none;
    &:focus { border-color: var(--color-primary, #ffd800); }
  }
  label { font-weight: 700; font-size: 11px; color: var(--color-text, #1a1a1a); }
}
```

- [ ] **Step 3: Verificación visual tipo por tipo**

Levantar la app con un token cuyo payload tenga `origin: "sacom"` y navegar a `/:idClient/:businessId`. Recorrer cada `displayType` presente en el esquema y confirmar que adopta el look drawer. Para los tipos que no respondan al override global (componentes con estilos encapsulados fuertes: `file`, `phones`, `opening-hours`, `location-map`, `pill-multiselect`, `array-*`), añadir reglas específicas en `_sacom.scss` usando los selectores reales de cada componente, o ajustar el SCSS del componente bajo `:host-context([data-origin='sacom'])`.

Lista a verificar (de `block-fields.component.html`): `text/default`, `textarea`, `select`, `multiselect`, `checkbox-grid`, `file`, `opening-hours`, `opening-hours-flexible`, `location-map`, `domain-option`, `pill-multiselect`, `productos-servicios`, `phones`, `url`, `array-object`, `array-primitive`.

- [ ] **Step 4: Build y commit incremental**

Run: `npx ng build`
Expected: build sin errores.

```bash
git add src/index.html src/styles.scss src/styles/_sacom.scss
git commit -m "feat(theme): fuente Inter y re-skin de campos bajo data-origin=sacom"
```

> Repetir Step 3–4 por tanda de tipos de campo hasta cubrir todos. Commits pequeños por tanda.

---

## Task 9: Actualizar regresión de layout y verificación final

**Files:**
- Modify: `src/app/layouts/layout-host.integration.spec.ts`
- Test: full suite

**Interfaces:**
- Consumes: comportamiento route-aware (Tasks 3-4).

- [ ] **Step 1: Revisar el spec de integración del layout**

`layout-host.integration.spec.ts` llama directamente `theme.applyFromOrigin('brandx')` para simular el swap. Eso **sigue siendo válido** (el binder usa el mismo método). Verificar que el test pasa tal cual; si falla por el cambio de modelo, ajustarlo para setear `theme.sessionOrigin.set('brandx')` + navegar a una ruta `brandable`, o mantener la llamada directa a `applyFromOrigin` (que es lo que el binder invoca). Elegir la opción que refleje el flujo real (preferible: llamar `applyFromOrigin` directo, ya que el test aísla `LayoutHostComponent`).

- [ ] **Step 2: Correr toda la suite**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS (toda la suite, incluidos los specs nuevos).

- [ ] **Step 3: Build de producción**

Run: `npx ng build`
Expected: build sin errores ni warnings nuevos.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(theme): alinear regresión de layout al modelo route-aware"
```

---

## Self-Review (cobertura del spec)

- Spec §2.1 Trigger origin=SACOM → Task 1 (registro `sacom`) + Task 3/4 (binder lee sessionOrigin).
- Spec §2.2 Scope solo ruta del form → Task 3 (`brandable`) + Task 4 (`data.brandable`).
- Spec §2.3 Full-screen sin overlay → Task 1 (layout) + Task 7 (full-screen).
- Spec §2.4 Sin header → Task 7.
- Spec §2.5 Wizard un bloque por paso → Task 6.
- Spec §2.6 Avance gateado → Task 6 (`nextStep`/`currentStepInvalid`).
- Spec §2.7 Preservar funcionalidad → Task 5 (BlockFields reutilizado) + Task 6 (footer mapea a métodos existentes; modal conservado).
- Spec §4 Theming route-aware → Tasks 2, 3, 4.
- Spec §5 Layout + tokens → Task 1; fuente Inter → Task 8.
- Spec §6 Wizard → Tasks 5, 6.
- Spec §7 Tokens → Task 1 (cssVars).
- Spec §8 Re-skin campos (riesgo) → Task 8.
- Spec §9 Pruebas → Tasks 3, 4, 6, 9.
- Spec §10 Inventario → cubierto por Tasks 1-9.
