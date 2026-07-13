import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-business-empty-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './business-empty-state.component.html',
  styleUrl: './business-empty-state.component.scss'
})
export class BusinessEmptyStateComponent {
  @Output() home = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  emitHome(): void {
    this.home.emit();
  }

  emitRetry(): void {
    this.retry.emit();
  }
}
