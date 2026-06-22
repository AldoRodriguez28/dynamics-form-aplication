import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { DynamicFormComponent } from './dynamic-form.component';
import { ThemeService } from '../theme/theme.service';
import { SACOM_THEME } from '../theme/themes/sacom.theme';

describe('DynamicFormComponent – stepper SACOM', () => {
  function make(): DynamicFormComponent {
    TestBed.configureTestingModule({
      imports: [DynamicFormComponent],
      providers: [provideHttpClient()],
    });
    const fixture = TestBed.createComponent(DynamicFormComponent);
    const cmp = fixture.componentInstance;
    cmp.blocks = [
      { code: 'b1', title: 'Uno', rows: [] } as any,
      { code: 'b2', title: 'Dos', rows: [] } as any,
    ];
    cmp.form = new FormGroup({
      b1: new FormGroup({ x: new FormControl('', Validators.required) }),
      b2: new FormGroup({ y: new FormControl('ok') }),
    });
    return cmp;
  }

  it('variant es "sacom" cuando el tema activo es sacom', () => {
    const cmp = make();
    TestBed.inject(ThemeService).active.set(SACOM_THEME);
    expect(cmp.variant()).toBe('sacom');
  });

  it('nextStep NO avanza si el bloque actual es inválido', () => {
    const cmp = make();
    expect(cmp.currentStep()).toBe(0);
    cmp.nextStep();
    expect(cmp.currentStep()).toBe(0);
  });

  it('nextStep avanza cuando el bloque actual es válido', () => {
    const cmp = make();
    (cmp.form.get('b1') as FormGroup).get('x')!.setValue('lleno');
    cmp.nextStep();
    expect(cmp.currentStep()).toBe(1);
  });

  it('prevStep retrocede libremente', () => {
    const cmp = make();
    (cmp.form.get('b1') as FormGroup).get('x')!.setValue('lleno');
    cmp.nextStep();
    cmp.prevStep();
    expect(cmp.currentStep()).toBe(0);
  });
});
