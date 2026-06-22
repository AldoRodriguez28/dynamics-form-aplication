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
