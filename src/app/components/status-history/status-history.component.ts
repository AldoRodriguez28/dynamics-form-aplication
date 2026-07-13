import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { BusinessStatusAuditEntry } from '../../Interfaces/business/response/business-status-audit.response';

export type { BusinessStatusAuditEntry } from '../../Interfaces/business/response/business-status-audit.response';

/** Un paso de la línea de tiempo: transición de estado. */
export interface StatusTransition {
  id: string;
  oldState: string;
  newState: string;
  fecha: Date;
  action: string;
  actorType: string;
  actorId: string;
}

export interface FormRecord {
  id: string;
  nombre: string;
  estadoActual: string;
  historial: StatusTransition[];
}

export function transitionsFromAudit(
  entries: BusinessStatusAuditEntry[]
): StatusTransition[] {
  return entries.map((e) => ({
    id: String(e.auditId),
    oldState: e.oldState,
    newState: e.newState,
    fecha: new Date(e.createdAt),
    action: e.action,
    actorType: e.actorType,
    actorId: e.actorId,
  }));
}

@Component({
  selector: 'app-status-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-history.component.html',
  styleUrl: './status-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('sidebarSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate(
          '320ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '260ms cubic-bezier(0.4, 0, 1, 1)',
          style({ transform: 'translateX(100%)' })
        ),
      ]),
    ]),
    trigger('backdropFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('240ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class StatusHistoryComponent {
  /**
   * Si es true, solo se renderiza el panel lateral (sin tabla ni cabecera propias).
   * Útil embebido en `business-list` u otras vistas que ya tienen el listado.
   */
  readonly embedded = input(false);

  /** Filas en la tabla de la vista playground (vacío; el historial real va desde business-list). */
  protected readonly forms = signal<FormRecord[]>([]);

  /** Panel lateral visible. */
  protected readonly sidebarOpen = signal(false);

  /** Carga remota del historial (p. ej. desde business-list). */
  protected readonly historyLoading = signal(false);

  protected readonly historyError = signal<string | null>(null);

  /** Formulario cuyo historial se muestra en el panel. */
  protected readonly selectedForm = signal<FormRecord | null>(null);

  /** Historial ordenado del más reciente al más antiguo (copia para plantilla). */
  protected readonly historialOrdenado = computed(() => {
    const form = this.selectedForm();
    if (!form) return [];
    return [...form.historial].sort(
      (a, b) => b.fecha.getTime() - a.fecha.getTime()
    );
  });

  private readonly stateLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    IN_PROGRESS: 'En progreso',
    CONTENT_IN_CREATION: 'Contenido en creación',
    READY: 'Listo',
    PENDING: 'Pendiente',
    COMPLETED: 'Completado',
    LOCKED: 'Bloqueado',
    SHARED_WITH_CLIENT: 'Compartido con cliente',
  };

  private readonly actionLabels: Record<string, string> = {
    UPDATE_CONTENT: 'Actualización de contenido',
  };

  /** Abre el drawer con el registro indicado (llamable desde el padre vía `viewChild`). */
  openHistory(record: FormRecord): void {
    this.selectedForm.set(record);
    this.sidebarOpen.set(true);
    this.historyLoading.set(false);
    this.historyError.set(null);
  }

  /**
   * Abre el drawer y muestra estado de carga hasta que el padre llame a `setHistorial` o `setHistoryError`.
   */
  beginHistoryLoad(record: FormRecord): void {
    this.selectedForm.set({ ...record, historial: [] });
    this.sidebarOpen.set(true);
    this.historyLoading.set(true);
    this.historyError.set(null);
  }

  setHistorial(historial: StatusTransition[]): void {
    const form = this.selectedForm();
    if (!form) {
      return;
    }
    this.selectedForm.set({ ...form, historial });
    this.historyLoading.set(false);
    this.historyError.set(null);
  }

  setHistoryError(message: string | null): void {
    this.historyError.set(message);
    this.historyLoading.set(false);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
    this.historyLoading.set(false);
    this.historyError.set(null);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeSidebar();
    }
  }

  protected displayState(code: string | null | undefined): string {
    const c = (code ?? '').trim().toUpperCase();
    if (!c) {
      return '—';
    }
    return this.stateLabels[c] ?? c.replace(/_/g, ' ');
  }

  protected stateVariant(code: string | null | undefined): string {
    const c = (code ?? '').trim().toUpperCase();
    if (!c) {
      return 'UNKNOWN';
    }
    return c;
  }

  protected displayAction(action: string): string {
    return this.actionLabels[action] ?? action.replace(/_/g, ' ');
  }

  protected actorSummary(actorType: string, actorId: string): string {
    const type = (actorType || '—').trim();
    const id = (actorId || '—').trim();
    if (type === 'SYSTEM') {
      return `Sistema · ${id}`;
    }
    if (type === 'USER') {
      return id;
    }
    return `${type} · ${id}`;
  }

  protected transitionAria(item: StatusTransition): string {
    return `Cambio de estado: ${this.displayState(item.oldState)} a ${this.displayState(
      item.newState
    )}. ${this.displayAction(item.action)}. ${this.actorSummary(
      item.actorType,
      item.actorId
    )}.`;
  }
}
