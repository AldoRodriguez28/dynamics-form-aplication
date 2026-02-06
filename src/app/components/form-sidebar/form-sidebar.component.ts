import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';
import { BlockView } from '../../dynamic-form/services/block-factory.service';

type BlockState = 'incompleto' | 'completo' | 'editado' | 'con-error' | 'pendiente';

@Component({
  selector: 'app-form-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-sidebar.component.html',
  styleUrl: './form-sidebar.component.scss'
})
export class FormSidebarComponent {
  @Input({ required: true }) blocks: BlockView[] = [];
  @Input() form?: FormGroup;
  private initialValues = new Map<string, unknown>();

  filledCount(code: string): number {
    const group = this.form?.get(code);
    if (!group) return 0;
    const value = group.value as Record<string, unknown>;
    let count = 0;
    Object.values(value || {}).forEach((v) => {
      if (this.isFilled(v)) count++;
    });
    return count;
  }

  statusClass(code: string, total: number): string {
    const state = this.blockState(code, total);
    if (state === 'con-error') return 'sidebar__status --error';
    if (state === 'completo') return 'sidebar__status --done';
    if (state === 'editado') return 'sidebar__status --progress';
    if (state === 'incompleto') return 'sidebar__status --pending';
    return 'sidebar__status --pending';
  }

  statusLabel(code: string, total: number): string {
    const state = this.blockState(code, total);
    switch (state) {
      case 'completo':
        return 'Completo';
      case 'editado':
        return 'Editado';
      case 'con-error':
        return 'Con error';
      case 'incompleto':
        return 'Incompleto';
      default:
        return 'Pendiente';
    }
  }

  progressPercent(code: string, total: number): number {
    const filled = this.filledCount(code);
    if (!total) return 0;
    return Math.min(100, Math.round((filled / total) * 100));
  }

  private blockState(code: string, total: number): BlockState {
    const group = this.form?.get(code) as FormGroup | undefined;
    if (!group) return 'pendiente';

    // Guardar snapshot inicial para detectar "editado"
    if (!this.initialValues.has(code)) {
      this.initialValues.set(code, this.cloneValue(group.getRawValue()));
    }

    const hasRequiredMissing = this.hasRequiredMissing(group);
    const hasOtherErrors = this.hasNonRequiredErrors(group);
    const isEdited = !this.deepEqual(this.initialValues.get(code), group.getRawValue());
    const filled = this.filledCount(code);
    const isComplete = !hasRequiredMissing && !hasOtherErrors && group.valid && filled >= total && total > 0;

    if (hasRequiredMissing) return 'con-error';
    if (hasOtherErrors) return 'con-error';
    if (isComplete) return 'completo';
    if (isEdited) return 'editado';
    if (filled > 0) return 'incompleto';
    return 'pendiente';
  }

  private hasRequiredMissing(control: FormGroup): boolean {
    const check = (c: any): boolean => {
      if (!c) return false;
      if (c.controls) {
        return Object.values(c.controls).some(check);
      }
      const errors = c.errors as Record<string, unknown> | null;
      return !!errors?.['required'];
    };
    return check(control);
  }

  private hasNonRequiredErrors(control: FormGroup): boolean {
    const check = (c: any): boolean => {
      if (!c) return false;
      if (c.controls) {
        return Object.values(c.controls).some(check);
      }
      const errors = c.errors as Record<string, unknown> | null;
      if (!errors) return false;
      const keys = Object.keys(errors);
      return keys.some((k) => k !== 'required');
    };
    return check(control);
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private cloneValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  private isFilled(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.some((v) => this.isFilled(v));
    if (typeof value === 'object') return Object.values(value).some((v) => this.isFilled(v));
    if (typeof value === 'boolean') return value === true;
    return true;
  }

  onSelect(code: string): void {
    const el = document.querySelector<HTMLElement>(`[data-block="${code}"]`);
    if (!el) return;
    el.setAttribute('open', 'true');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  hasErrors(code: string, total: number): boolean {
    return this.blockState(code, total) === 'con-error';
  }

  showErrors(block: BlockView, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    const fields = this.getErrorFields(block);
    if (!fields.length) {
      Swal.fire({
        icon: 'info',
        title: 'Sin errores detectados',
        text: 'No se encontraron campos con error en este bloque.'
      });
      return;
    }

    const detail = fields.map((label) => `• ${label}`).join('<br>');

    Swal.fire({
      icon: 'error',
      title: 'Campos con error',
      html: detail
    });
  }

  private getErrorFields(block: BlockView): string[] {
    const group = this.form?.get(block.code);
    if (!group) return [];
    const labels = new Set<string>();

    block.rows.forEach((row) => {
      row.fields.forEach((field) => {
        const control = this.form?.get([block.code, field.name]);
        if (!control) return;
        if (this.controlHasErrors(control)) {
          labels.add(field.label || field.name);
        }
      });
    });

    return Array.from(labels);
  }

  private controlHasErrors(control: AbstractControl): boolean {
    if (control.errors && Object.keys(control.errors).length > 0) return true;
    if (control instanceof FormGroup) {
      return Object.values(control.controls).some((child) => this.controlHasErrors(child));
    }
    if (control instanceof FormArray) {
      return control.controls.some((child) => this.controlHasErrors(child));
    }
    return false;
  }
}
