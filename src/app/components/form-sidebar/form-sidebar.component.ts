import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

type SidebarBlock = {
  code: string;
  title: string;
  fieldCount: number;
};

@Component({
  selector: 'app-form-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-sidebar.component.html',
  styleUrl: './form-sidebar.component.scss'
})
export class FormSidebarComponent {
  @Input({ required: true }) blocks: SidebarBlock[] = [];
  @Input() form?: FormGroup;

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
    const filled = this.filledCount(code);
    if (filled >= total && total > 0) return 'sidebar__status --done';
    if (filled > 0) return 'sidebar__status --progress';
    return 'sidebar__status --pending';
  }

  private isFilled(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    if (typeof value === 'boolean') return value === true;
    return true;
  }

  onSelect(code: string): void {
    const el = document.querySelector<HTMLElement>(`[data-block="${code}"]`);
    if (!el) return;
    el.setAttribute('open', 'true');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
