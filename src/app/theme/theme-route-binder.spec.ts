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
