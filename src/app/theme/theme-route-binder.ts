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
      this.theme.applyFromOrigin(key);
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
