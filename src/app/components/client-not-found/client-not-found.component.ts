import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-client-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-not-found.component.html',
  styleUrl: './client-not-found.component.scss'
})
export class ClientNotFoundComponent {
  @Input() clientId = '';
  @Output() home = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  emitHome(): void {
    this.home.emit();
  }

  emitRetry(): void {
    this.retry.emit();
  }
}
