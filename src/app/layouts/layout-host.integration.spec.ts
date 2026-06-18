import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LayoutHostComponent } from './layout-host.component';
import { ThemeService } from '../theme/theme.service';

/** Tiny standalone dummy page used as routed content. */
@Component({
  standalone: true,
  template: '<p class="routed-content">RUTA-OK</p>',
})
class DummyPageComponent {}

describe('LayoutHostComponent – integration: layout swap during navigation', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [LayoutHostComponent],
      providers: [
        provideRouter([{ path: 'p', component: DummyPageComponent }]),
      ],
    });

    const fixture = TestBed.createComponent(LayoutHostComponent);
    const router = TestBed.inject(Router);
    const theme = TestBed.inject(ThemeService);

    return { fixture, router, theme };
  }

  afterEach(() => {
    document.documentElement.removeAttribute('data-origin');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-accent');
  });

  it(
    'routed content survives a mid-session layout swap from default → brandx',
    fakeAsync(() => {
      const { fixture, router, theme } = setup();

      // Bootstrap the component with the default layout.
      fixture.detectChanges();

      // Step 1 – navigate to /p while still in the default layout.
      router.navigateByUrl('/p');
      tick(); // let the router settle
      fixture.detectChanges();
      flush(); // drain any remaining microtasks / macrotasks

      const nativeEl: HTMLElement = fixture.nativeElement;

      // Verify pre-condition: default layout is rendered and content is present.
      const defaultShell = nativeEl.querySelector('[data-layout="default"]');
      const contentBeforeSwap = nativeEl.querySelector('.routed-content');

      expect(defaultShell).withContext('default layout shell should be present before swap').toBeTruthy();
      expect(contentBeforeSwap).withContext('routed content should be visible in default layout').toBeTruthy();
      expect(contentBeforeSwap?.textContent?.trim())
        .withContext('routed content text should be RUTA-OK before swap')
        .toBe('RUTA-OK');

      // Step 2 – simulate what a route resolver does: call applyFromOrigin('brandx'),
      // which flips layoutKey and causes NgComponentOutlet to DESTROY the default layout
      // (and its <router-outlet>) and CREATE a fresh brandx layout.
      theme.applyFromOrigin('brandx');
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      flush();

      // Step 3 – post-swap assertions.
      const brandxShell = nativeEl.querySelector('[data-layout="brandx"]');
      const defaultShellAfter = nativeEl.querySelector('[data-layout="default"]');
      const contentAfterSwap = nativeEl.querySelector('.routed-content');

      expect(brandxShell)
        .withContext('brandx layout shell should be present after swap')
        .toBeTruthy();

      expect(defaultShellAfter)
        .withContext('default layout shell should be GONE after swap')
        .toBeFalsy();

      // This is the critical assertion: does the routed content survive the layout swap?
      // If this fails, the bug is confirmed — the content area is blank after the swap.
      expect(contentAfterSwap)
        .withContext(
          'BUG CHECK: routed content should still be visible inside brandx layout after layout swap',
        )
        .toBeTruthy();

      expect(contentAfterSwap?.textContent?.trim())
        .withContext('routed content text inside brandx layout should still be RUTA-OK')
        .toBe('RUTA-OK');
    }),
  );
});
