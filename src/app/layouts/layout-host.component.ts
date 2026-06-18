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
