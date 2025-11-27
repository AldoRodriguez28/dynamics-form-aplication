import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-textarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-textarea.component.html',
  styleUrl: './field-textarea.component.scss'
})
export class FieldTextareaComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
}
