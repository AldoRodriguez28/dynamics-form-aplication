import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BusinessResponse } from '../../services/response/business/business.response';

@Component({
  selector: 'app-copy-block-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './copy-block-modal.component.html',
  styleUrl: './copy-block-modal.component.scss'
})
export class CopyBlockModalComponent {
  @Input() visible = false;
  @Input() businesses: BusinessResponse[] = [];
  @Input() loading = false;
  @Input() currentBusinessId?: string | number;
  @Output() selectBusiness = new EventEmitter<BusinessResponse>();
  @Output() closeModal = new EventEmitter<void>();

  get filteredBusinesses(): BusinessResponse[] {
    return this.businesses.filter(
      (b) => String(b.businessId) !== String(this.currentBusinessId)
    );
  }

  onSelect(business: BusinessResponse): void {
    this.selectBusiness.emit(business);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }
}
