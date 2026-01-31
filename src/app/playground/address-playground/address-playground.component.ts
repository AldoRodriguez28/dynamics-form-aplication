import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldLocationMapComponent } from '../../components/field-location-map/field-location-map.component';

/**
 * Playground (sandbox) para probar el campo de Dirección / Coordenadas
 * sin necesidad de ejecutar el flujo completo.
 *
 * URL sugerida: /playground/direccion
 */
@Component({
  selector: 'app-address-playground',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldLocationMapComponent],
  templateUrl: './address-playground.component.html',
  styleUrl: './address-playground.component.scss'
})
export class AddressPlaygroundComponent {
  // Controles mínimos para simular tu caso real
    enforceCompleteAddress = true;

  form = new FormGroup({
    address: new FormControl<string>('', { nonNullable: true }),
    coords: new FormControl<string>('', { nonNullable: true }),
    structured: new FormControl<string>('', { nonNullable: true })
  });

  // Campo dummy para cumplir el input "field" del FieldLocationMapComponent.
  // En tu flujo real, esto viene del schema.
  fieldMock: any = {
    name: 'location',
    label: 'Ubicación',
    type: 'location',
    required: false
  };

  get addressCtrl(): FormControl<string> {
    return this.form.controls.address;
  }

  get coordsCtrl(): FormControl<string> {
    return this.form.controls.coords;
  }

  get structuredCtrl(): FormControl<string> {
    return this.form.controls.structured;
  }

  // Helpers para probar rápido
  setExample1(): void {
    this.addressCtrl.setValue('Av. Paseo de la Reforma, CDMX');
    this.coordsCtrl.setValue('19.432608,-99.133209');
    this.structuredCtrl.setValue('');
  }

  clear(): void {
    this.form.reset({ address: '', coords: '', structured: '' });
  }
}
