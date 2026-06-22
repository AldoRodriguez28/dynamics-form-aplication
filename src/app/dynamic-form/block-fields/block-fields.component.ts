import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { getControl, getFieldOptions } from '../../utils';
import { OptionItemInterface } from '../interface/OptionItem.intreface';
import { BlockView } from '../services/block-factory.service';
import {
  FieldArrayObjectComponent,
  FieldArrayPrimitiveComponent,
  FieldFileComponent,
  FieldInputComponent,
  FieldUrlComponent,
  FieldPhoneComponent,
  FieldDomainOptionComponent,
  FieldOpeningHoursComponent,
  FieldOpeningHoursFlexibleComponent,
  FieldLocationMapComponent,
  FieldPillMultiselectComponent,
  FieldProductosServiciosComponent,
  FieldMultiselectComponent,
  FieldSelectComponent,
  FieldTextareaComponent,
} from '../../components';

@Component({
  selector: 'app-block-fields',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FieldInputComponent,
    FieldUrlComponent,
    FieldTextareaComponent,
    FieldSelectComponent,
    FieldMultiselectComponent,
    FieldFileComponent,
    FieldDomainOptionComponent,
    FieldLocationMapComponent,
    FieldPillMultiselectComponent,
    FieldProductosServiciosComponent,
    FieldArrayObjectComponent,
    FieldArrayPrimitiveComponent,
    FieldPhoneComponent,
    FieldOpeningHoursComponent,
    FieldOpeningHoursFlexibleComponent,
  ],
  templateUrl: './block-fields.component.html',
})
export class BlockFieldsComponent {
  @Input({ required: true }) block!: BlockView;
  @Input({ required: true }) group!: FormGroup;
  @Input() optionsMap: Record<string, OptionItemInterface[]> = {};
  @Input() readOnly = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctrl(name: string): FormControl<any> {
    return getControl(this.group, [name]) as FormControl<any>;
  }

  arr(name: string): FormArray {
    return this.group.get(name) as FormArray;
  }

  opts(name: string): OptionItemInterface[] {
    return getFieldOptions(this.optionsMap, this.block.code, name);
  }
}
