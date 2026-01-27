import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

declare global {
  interface Window {
    google?: any;
  }
}

@Component({
  selector: 'app-field-location-map',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SafeUrlPipe],
  templateUrl: './field-location-map.component.html',
  styleUrl: './field-location-map.component.scss'
})
export class FieldLocationMapComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) coordsControl!: FormControl<string>;
  @Input({ required: true }) addressControl!: FormControl<string>;
  @Input() blockName = 'Ubicación';
  @Input() readOnly = false;

  /**
   * Dejado "en duro" como pediste. Reemplaza por tu key real.
   * Requiere: Maps JavaScript API + Places API.
   */
  private readonly googleApiKey = 'AIzaSyAFCIa0qeizJG-XcmBoMNxru1PFSDC4qNw';

  @ViewChild('addressInput', { static: false })
  addressInputRef?: ElementRef<HTMLInputElement>;

  lat = '';
  lng = '';

  private autocomplete: any | null = null;
  private placeListener: any | null = null;
  private static loadingPromise: Promise<void> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coordsControl'] || changes['addressControl']) {
      this.parseCoords();
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.readOnly) return;
    if (!this.addressInputRef?.nativeElement) return;

    // Si aún no pones la key, solo no inicializamos el autocomplete.
    if (!this.googleApiKey || this.googleApiKey.includes('REPLACE_WITH')) return;

    await this.ensureGooglePlacesLoaded(this.googleApiKey);
    this.initAutocomplete();
  }

  ngOnDestroy(): void {
    try {
      if (this.placeListener) this.placeListener.remove();
    } catch {
      // ignore
    }
    this.placeListener = null;
    this.autocomplete = null;
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

  // -----------------------
  // Google Places Autocomplete
  // -----------------------
  private initAutocomplete(): void {
    const input = this.addressInputRef?.nativeElement;
    if (!input) return;

    const google = window.google;
    if (!google?.maps?.places?.Autocomplete) return;

    this.autocomplete = new google.maps.places.Autocomplete(input, {
      // Lo mínimo necesario: formateo + coordenadas
      fields: ['geometry', 'formatted_address'],
      // Ajusta si manejas otros países
      componentRestrictions: { country: ['mx'] },
    });

    this.placeListener = this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete.getPlace();
      const loc = place?.geometry?.location;
      if (!loc) return;

      const formatted = place.formatted_address || input.value || '';
      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;

      // ✅ Seleccionó del autocomplete => guardamos address + coords
      this.addressControl.setValue(formatted, { emitEvent: true });
      this.lat = String(lat ?? '');
      this.lng = String(lng ?? '');
      this.updateCoords();
    });
  }

  private ensureGooglePlacesLoaded(apiKey: string): Promise<void> {
    if (window.google?.maps?.places) return Promise.resolve();

    if (!FieldLocationMapComponent.loadingPromise) {
      FieldLocationMapComponent.loadingPromise = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Error cargando Google Maps JS')));
          return;
        }

        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.dataset['googleMaps'] = '1';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&region=MX`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Error cargando Google Maps JS'));
        document.head.appendChild(script);
      });
    }

    return FieldLocationMapComponent.loadingPromise;
  }
}
