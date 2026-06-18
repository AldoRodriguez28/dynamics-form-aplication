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
