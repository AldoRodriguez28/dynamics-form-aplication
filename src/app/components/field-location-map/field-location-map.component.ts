import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'app-field-location-map',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SafeUrlPipe],
  templateUrl: './field-location-map.component.html',
  styleUrl: './field-location-map.component.scss'
})
export class FieldLocationMapComponent implements OnChanges {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) coordsControl!: FormControl<string>;
  @Input({ required: true }) addressControl!: FormControl<string>;
  @Input() blockName = 'Ubicación';
  @Input() readOnly = false;

  lat = '';
  lng = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coordsControl'] || changes['addressControl']) {
      this.parseCoords();
    }
  }

  parseCoords(): void {
    const value = (this.coordsControl?.value as string) || '';
    const parts = value.split(',').map((v) => v.trim());
    this.lat = parts[0] || '';
    this.lng = parts[1] || '';
  }

  updateCoords(): void {
    if (this.readOnly) return;
    const next = [this.lat, this.lng].filter(Boolean).join(',');
    this.coordsControl.setValue(next);
  }

  onLatChange(value: string): void {
    if (this.readOnly) return;
    this.lat = value;
    this.updateCoords();
  }

  onLngChange(value: string): void {
    if (this.readOnly) return;
    this.lng = value;
    this.updateCoords();
  }

  get mapUrl(): string {
    const hasCoords = this.lat && this.lng;
    if (hasCoords) {
      return `https://www.google.com/maps?q=${encodeURIComponent(this.lat)},${encodeURIComponent(this.lng)}&output=embed`;
    }
    const address = (this.addressControl?.value as string) || '';
    if (address) {
      return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    }
    return '';
  }
}
