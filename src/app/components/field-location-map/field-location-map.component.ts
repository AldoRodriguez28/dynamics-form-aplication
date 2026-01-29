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
  NgZone
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

declare global {
  interface Window {
    google?: any;
  }
}

type StructuredAddress = {
  street: string;
  number: string;       // número exterior o "S/N"
  postalCode: string;
  neighborhood: string; // colonia / fraccionamiento
  city: string;         // ciudad / municipio
  state: string;
  placeId?: string;
};


@Component({
  selector: 'app-field-location-map',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './field-location-map.component.html',
  styleUrl: './field-location-map.component.scss'
})
export class FieldLocationMapComponent implements OnChanges, AfterViewInit, OnDestroy {

  private _field!: FormField;
  /**
   * Angular templates don't automatically expose global objects like `JSON`.
   * Expose it explicitly so the template can call `JSON.stringify(...)`.
   */
  public JSON = JSON;

  @Input({ required: true })
  set field(value: FormField) {
    this._field = value;
    this.enforceCompleteAddress = !!value?.enforceCompleteAddress;
  }
  get field(): FormField {
    return this._field;
  }

  @Input({ required: true }) coordsControl!: FormControl<string>;
  @Input({ required: true }) addressControl!: FormControl<string>;

  /**
     * NUEVO: aquí guardamos la dirección estructurada como JSON string,
     * sin modificar el valor original de addressControl.
     *
     * En tu JSON final:
     *  - addressControl => dirección original (string)
     *  - coordsControl  => "lat,lng" (string)
     *  - structuredAddressControl => JSON string con {street, number, ...}
     */
  @Input() structuredAddressControl?: FormControl<string>;

  @Input() blockName = 'Ubicación';
  @Input() readOnly = false;

  /**
   * Dejado "en duro" como pediste. Reemplaza por tu key real.
   * Requiere: Maps JavaScript API + Places API.
   */
  private readonly googleApiKey = 'AIzaSyAFCIa0qeizJG-XcmBoMNxru1PFSDC4qNw';

  @ViewChild('addressInput', { static: false })
  addressInputRef?: ElementRef<HTMLInputElement>;

  @ViewChild('mapContainer', { static: false })
  mapContainerRef?: ElementRef<HTMLDivElement>;

  lat = '';
  lng = '';

  enforceCompleteAddress = false;

  // Dirección estructurada (draft) para completar si faltan piezas
  completionOpen = false;
  structuredDraft: StructuredAddress = this.emptyStructured();

  // Google Maps runtime objects
  private map: any | null = null;
  private marker: any | null = null;
  private autocomplete: any | null = null;
  private placeListener: any | null = null;
  private markerDragListener: any | null = null;
  private mapClickListener: any | null = null;

  private static loadingPromise: Promise<void> | null = null;
  structuredSubmitAttempted = false;
  missingStructured: Array<keyof StructuredAddress> = [];


  constructor(private ngZone: NgZone) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coordsControl']) {
      this.parseCoords();
      // Si el usuario ya tenía coords en el form, refleja en el mapa si está listo
      this.syncMarkerFromCoords();
    }
  }

  async ngAfterViewInit(): Promise<void> {
    // Inicializa coords -> inputs
    this.parseCoords();

    // Si no hay key, no inicializamos maps (pero el componente sigue funcionando como inputs)
    if (!this.googleApiKey || this.googleApiKey.includes('REPLACE_WITH')) return;

    await this.ensureGooglePlacesLoaded(this.googleApiKey);
    this.initMap();
    this.initAutocomplete();
    this.syncMarkerFromCoords();
  }

  ngOnDestroy(): void {
    try { if (this.placeListener) this.placeListener.remove(); } catch { }
    try { if (this.markerDragListener) this.markerDragListener.remove(); } catch { }
    try { if (this.mapClickListener) this.mapClickListener.remove(); } catch { }
    this.placeListener = null;
    this.markerDragListener = null;
    this.mapClickListener = null;
    this.autocomplete = null;
    this.map = null;
    this.marker = null;
  }

  // -----------------------
  // Coords input handlers
  // -----------------------
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
    // reflejar en mapa/pin sin tocar address
    this.syncMarkerFromCoords();
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

  // -----------------------
  // Map interactions
  // -----------------------
  private initMap(): void {
    const g = window.google;
    if (!g?.maps || !this.mapContainerRef?.nativeElement) return;

    const initial = this.getCurrentLatLng() ?? { lat: 19.432608, lng: -99.133209 }; // CDMX default
    this.map = new g.maps.Map(this.mapContainerRef.nativeElement, {
      center: initial,
      zoom: this.getCurrentLatLng() ? 17 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    this.marker = new g.maps.Marker({
      position: initial,
      map: this.map,
      draggable: !this.readOnly,
    });

    // Drag marker -> actualizar coords, sin tocar address
    this.markerDragListener = this.marker.addListener('dragend', (ev: any) => {
      const pos = ev?.latLng;
      if (!pos) return;
      this.setCoordsFromLatLng(pos.lat(), pos.lng(), /*pan*/ false);
    });

    // Click map -> mover pin, actualizar coords, sin tocar address
    this.mapClickListener = this.map.addListener('click', (ev: any) => {
      if (this.readOnly) return;
      const pos = ev?.latLng;
      if (!pos) return;
      this.setCoordsFromLatLng(pos.lat(), pos.lng(), /*pan*/ true);
    });
  }

  private syncMarkerFromCoords(): void {
    if (!this.map || !this.marker) return;
    const ll = this.getCurrentLatLng();
    if (!ll) return;
    this.marker.setPosition(ll);
    // No modificamos address al sincronizar coords
    this.map.setCenter(ll);
  }

  private getCurrentLatLng(): { lat: number; lng: number } | null {
    const lat = Number(this.lat);
    const lng = Number(this.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  private setCoordsFromLatLng(lat: number, lng: number, pan: boolean): void {
    if (this.readOnly) return;
    this.lat = String(lat);
    this.lng = String(lng);
    this.coordsControl.setValue(`${this.lat},${this.lng}`, { emitEvent: false });

    if (this.marker) this.marker.setPosition({ lat, lng });
    if (this.map && pan) this.map.panTo({ lat, lng });

  }

  // -----------------------
  // Autocomplete
  // -----------------------
  private initAutocomplete(): void {
    const g = window.google;
    const input = this.addressInputRef?.nativeElement;
    if (!g?.maps?.places?.Autocomplete || !input || this.readOnly) return;

    this.autocomplete = new g.maps.places.Autocomplete(input, {
      fields: ['address_components', 'geometry', 'formatted_address'],
      componentRestrictions: { country: ['mx'] },
    });

    this.placeListener = this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete.getPlace();

        this.onPlaceChanged(place);
      });

      //const place = this.autocomplete?.getPlace?.();
      //this.onPlaceChanged(place);
    });
  }

  private onPlaceChanged(place: any): void {
    if (!place?.geometry?.location) return;

    const formatted = place.formatted_address || this.addressControl.value || '';
    // 1) Mantener dirección original (string) tal cual
    this.addressControl.setValue(formatted, { emitEvent: false });

    const loc = place.geometry.location;
    const lat = loc.lat();
    const lng = loc.lng();

    // 2) Actualizar coords + pin
    this.setCoordsFromLatLng(lat, lng, true);
    if (this.map) {
      this.map.setZoom(18);
      this.map.panTo({ lat, lng });
    }

    // 3) Descomponer a campos estructurados (sin alterar texto)
    const structured = this.parseStructuredFromPlace(place);
    structured.placeId = place.place_id || undefined;

    this.structuredDraft = { ...structured };

    // 4) Guardar structured siempre (aunque esté incompleto)
    this.setStructuredControlValue(this.structuredDraft);

    // 5) Si faltan campos obligatorios, mostrar panel de completitud
    const missing = this.getMissingStructuredFields(this.structuredDraft);
    this.completionOpen = this.enforceCompleteAddress && missing.length > 0;
  }

  private parseStructuredFromPlace(place: any): StructuredAddress {
    const out = this.emptyStructured();
    const comps: any[] = Array.isArray(place?.address_components) ? place.address_components : [];

    const pick = (type: string) => comps.find(c => Array.isArray(c.types) && c.types.includes(type));
    const long = (type: string) => pick(type)?.long_name || '';
    const short = (type: string) => pick(type)?.short_name || '';

    out.street = long('route');
    out.number = long('street_number');
    out.postalCode = long('postal_code');

    // Colonia: sublocality_level_1 o neighborhood (según disponibilidad)
    out.neighborhood = long('sublocality_level_1') || long('neighborhood') || long('sublocality') || '';

    // Ciudad: locality o administrative_area_level_2
    out.city = long('locality') || long('administrative_area_level_2') || '';

    // Estado: administrative_area_level_1 (a veces conviene short_name: CDMX, etc.)
    out.state = long('administrative_area_level_1') || short('administrative_area_level_1') || '';

    // Si no viene número, déjalo vacío: el usuario podrá poner "S/N"
    return out;
  }

  private emptyStructured(): StructuredAddress {
    return { street: '', number: '', postalCode: '', neighborhood: '', city: '', state: '' };
  }

  private getMissingStructuredFields(s: StructuredAddress): Array<keyof StructuredAddress> {
    const missing: Array<keyof StructuredAddress> = [];
    if (!s.street) missing.push('street');
    // número: requerido pero se acepta "S/N"
    if (!s.number) missing.push('number');
    if (!s.postalCode) missing.push('postalCode');
    if (!s.neighborhood) missing.push('neighborhood');
    if (!s.city) missing.push('city');
    if (!s.state) missing.push('state');
    return missing;
  }

  // UI actions for completion panel
  toggleNoNumber(checked: boolean): void {
    if (checked) {
      this.structuredDraft.number = 'S/N';
    } else if (this.structuredDraft.number === 'S/N') {
      this.structuredDraft.number = '';
    }
    this.setStructuredControlValue(this.structuredDraft);
  }

  saveStructured(): void {
    this.structuredSubmitAttempted = true;

    const missing = this.getMissingStructuredFields(this.structuredDraft)
      .filter(k => !(k === 'number' && this.structuredDraft.number === 'S/N'));

    this.missingStructured = missing;

    if (this.enforceCompleteAddress && missing.length > 0) {
      this.completionOpen = true;
      return;
    }

    this.setStructuredControlValue(this.structuredDraft);
    this.completionOpen = false;
  }

  private setStructuredControlValue(val: StructuredAddress): void {
    const ctrl = this.structuredAddressControl;
    if (!ctrl) return;
    ctrl.setValue(JSON.stringify(val), { emitEvent: false });
  }

  // -----------------------
  // Script loader (Maps + Places)
  // -----------------------
  private ensureGooglePlacesLoaded(apiKey: string): Promise<void> {
    if (window.google?.maps?.places) return Promise.resolve();

    if (FieldLocationMapComponent.loadingPromise) return FieldLocationMapComponent.loadingPromise;

    FieldLocationMapComponent.loadingPromise = new Promise<void>((resolve, reject) => {
      // Evitar cargar dos veces
      const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
        return;
      }

      const script = document.createElement('script');
      script.setAttribute('data-google-maps', '1');
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps script failed to load'));
      document.head.appendChild(script);
    });

    return FieldLocationMapComponent.loadingPromise;
  }
}
