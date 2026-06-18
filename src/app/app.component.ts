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
