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
