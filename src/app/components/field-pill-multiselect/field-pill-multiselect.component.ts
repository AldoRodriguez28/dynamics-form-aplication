import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, OptionItem } from '../../models/form-schema.model';

type PillValue = OptionItem['value'];
type PillOption = { value: PillValue; label: string };

@Component({
  selector: 'app-field-pill-multiselect',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-pill-multiselect.component.html',
  styleUrl: './field-pill-multiselect.component.scss'
})
export class FieldPillMultiselectComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl<PillValue[]>;
  @Input() options: OptionItem[] = [];

  get items(): PillValue[] {
    const value = this.control?.value;
    return Array.isArray(value) ? value : [];
  }

  get pillOptions(): PillOption[] {
    const base = (this.options ?? []).map((opt) => ({
      value: opt.value,
      label: opt.label
    }));
    const selectedExtras = this.items
      .filter((val) => !base.some((opt) => opt.value === val))
      .map((val) => ({ value: val, label: String(val) }));
    return [...base, ...selectedExtras];
  }

  toggle(item: PillValue): void {
    const current = this.items;
    const exists = current.includes(item);
    const next = exists ? current.filter((v) => v !== item) : [...current, item];
    this.control.setValue(next);
  }

  isSelected(item: PillValue): boolean {
    return this.items.includes(item);
  }

  trackByVal(_index: number, val: PillValue): string {
    return String(val);
  }

  get selectedCount(): number {
    return this.items.length;
  }
}
