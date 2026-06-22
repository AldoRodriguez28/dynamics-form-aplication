import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { BlockFieldsComponent } from './block-fields.component';

describe('BlockFieldsComponent', () => {
  let fixture: ComponentFixture<BlockFieldsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BlockFieldsComponent] });
    fixture = TestBed.createComponent(BlockFieldsComponent);
  });

  it('renderiza un input de texto para un campo default', () => {
    fixture.componentInstance.group = new FormGroup({ nombre: new FormControl('') });
    fixture.componentInstance.block = {
      code: 'b1',
      title: 'Bloque',
      rows: [{ num: 1, fields: [{ name: 'nombre', displayType: 'text', colSpan: 12 }] }],
    } as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-field-input')).toBeTruthy();
  });
});
