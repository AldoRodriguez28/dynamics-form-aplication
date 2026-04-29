import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

export interface StatusHistory {
  id: string;
  estado: string;
  fecha: Date;
  usuario: string;
}

export interface FormRecord {
  id: string;
  nombre: string;
  estadoActual: string;
  historial: StatusHistory[];
}

const MOCK_FORMS: FormRecord[] = [
  {
    id: 'FRM-2024-0182',
    nombre: 'Alta de comercio — Centro',
    estadoActual: 'En revisión',
    historial: [
      {
        id: 'SH-001',
        estado: 'Borrador',
        fecha: new Date('2026-04-12T09:14:00'),
        usuario: 'maria.garcia@empresa.test',
      },
      {
        id: 'SH-002',
        estado: 'Enviado',
        fecha: new Date('2026-04-12T11:40:22'),
        usuario: 'maria.garcia@empresa.test',
      },
      {
        id: 'SH-003',
        estado: 'En revisión',
        fecha: new Date('2026-04-14T08:05:00'),
        usuario: 'sistema.workflow',
      },
    ],
  },
  {
    id: 'FRM-2024-0190',
    nombre: 'Renovación de licencia',
    estadoActual: 'Aprobado',
    historial: [
      {
        id: 'SH-010',
        estado: 'Borrador',
        fecha: new Date('2026-03-01T16:22:00'),
        usuario: 'carlos.ruiz@empresa.test',
      },
      {
        id: 'SH-011',
        estado: 'Enviado',
        fecha: new Date('2026-03-02T10:00:00'),
        usuario: 'carlos.ruiz@empresa.test',
      },
      {
        id: 'SH-012',
        estado: 'En revisión',
        fecha: new Date('2026-03-03T14:18:33'),
        usuario: 'revisor.norte',
      },
      {
        id: 'SH-013',
        estado: 'Aprobado',
        fecha: new Date('2026-03-05T09:00:00'),
        usuario: 'supervisor.norte',
      },
    ],
  },
  {
    id: 'FRM-2024-0201',
    nombre: 'Cambio de titular',
    estadoActual: 'Devuelto con observaciones',
    historial: [
      {
        id: 'SH-020',
        estado: 'Borrador',
        fecha: new Date('2026-04-20T13:45:00'),
        usuario: 'ana.lopez@empresa.test',
      },
      {
        id: 'SH-021',
        estado: 'Enviado',
        fecha: new Date('2026-04-21T08:30:00'),
        usuario: 'ana.lopez@empresa.test',
      },
      {
        id: 'SH-022',
        estado: 'Devuelto con observaciones',
        fecha: new Date('2026-04-22T15:12:00'),
        usuario: 'revisor.central',
      },
    ],
  },
];

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

  /** Filas mostradas en la tabla principal (vista demo / playground). */
  protected readonly forms = signal<FormRecord[]>(MOCK_FORMS);

  /** Panel lateral visible. */
  protected readonly sidebarOpen = signal(false);

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

  /** Abre el drawer con el registro indicado (llamable desde el padre vía `viewChild`). */
  openHistory(record: FormRecord): void {
    this.selectedForm.set(record);
    this.sidebarOpen.set(true);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeSidebar();
    }
  }
}
