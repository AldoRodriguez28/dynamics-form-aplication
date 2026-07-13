import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  EventEmitter,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { AuditEventEntry, AuditEventDetail } from '../../Interfaces/business/response/audit-event.response';
import { AuditDetailComponent } from './audit-detail/audit-detail.component';

export interface AuditRecord {
  businessId: string;
  commercialName: string;
}

@Component({
  selector: 'app-audit-history',
  standalone: true,
  imports: [CommonModule, AuditDetailComponent],
  templateUrl: './audit-history.component.html',
  styleUrl: './audit-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('sidebarSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('320ms cubic-bezier(0.22, 1, 0.36, 1)', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('260ms cubic-bezier(0.4, 0, 1, 1)', style({ transform: 'translateX(100%)' })),
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
export class AuditHistoryComponent {
  @ViewChild('drawerBody') private drawerBody!: ElementRef<HTMLElement>;

  protected readonly sidebarOpen = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly record = signal<AuditRecord | null>(null);
  protected readonly events = signal<AuditEventEntry[]>([]);
  protected readonly detailLoading = signal<number | null>(null);
  protected readonly expandedAuditId = signal<number | null>(null);
  protected readonly detailData = signal<AuditEventDetail | null>(null);
  protected readonly detailError = signal<string | null>(null);
  protected readonly lastViewedAuditId = signal<number | null>(null);

  private savedScrollTop = 0;

  @Output() requestDetail = new EventEmitter<number>();

  protected readonly sortedEvents = computed(() => {
    return [...this.events()].sort(
      (a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );
  });

  private readonly actionLabels: Record<string, string> = {
    UPDATE_CONTENT: 'Actualización de contenido',
    CHANGE_VERSION_STATE: 'Cambio de estado',
    CREATE_BLOCK_CONTENT: 'Creación de bloque',
    CREATE_VERSION: 'Creación de versión',
    UPDATE_BLOCK_CONTENT: 'Actualización de bloque',
  };

  private readonly stateLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    IN_PROGRESS: 'En progreso',
    CONTENT_IN_CREATION: 'Contenido en creación',
    READY: 'Listo',
    PENDING: 'Pendiente',
    COMPLETED: 'Completado',
    LOCKED: 'Bloqueado',
    SHARED_WITH_CLIENT: 'Compartido con cliente',
    ACTIVE: 'Activo',
  };

  beginLoad(record: AuditRecord): void {
    this.record.set(record);
    this.events.set([]);
    this.sidebarOpen.set(true);
    this.loading.set(true);
    this.error.set(null);
    this.lastViewedAuditId.set(null);
    this.collapseDetail();
  }

  setEvents(entries: AuditEventEntry[]): void {
    this.events.set(entries);
    this.loading.set(false);
    this.error.set(null);
  }

  setError(message: string): void {
    this.error.set(message);
    this.loading.set(false);
  }

  beginDetailLoad(auditId: number): void {
    this.savedScrollTop = this.drawerBody?.nativeElement?.scrollTop ?? 0;
    this.lastViewedAuditId.set(auditId);
    this.expandedAuditId.set(auditId);
    this.detailLoading.set(auditId);
    this.detailData.set(null);
    this.detailError.set(null);
    this.requestDetail.emit(auditId);
  }

  goBackToList(): void {
    this.collapseDetail();
    setTimeout(() => {
      if (this.drawerBody?.nativeElement) {
        this.drawerBody.nativeElement.scrollTop = this.savedScrollTop;
      }
    });
  }

  setDetail(detail: AuditEventDetail): void {
    this.detailData.set(detail);
    this.detailLoading.set(null);
  }

  setDetailError(message: string): void {
    this.detailError.set(message);
    this.detailLoading.set(null);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.collapseDetail();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeSidebar();
    }
  }

  protected displayAction(action: string): string {
    return this.actionLabels[action] ?? action.replace(/_/g, ' ');
  }

  protected displayState(code: string | null | undefined): string {
    const c = (code ?? '').trim().toUpperCase();
    if (!c) return '—';
    return this.stateLabels[c] ?? c.replace(/_/g, ' ');
  }

  protected stateVariant(code: string | null | undefined): string {
    return (code ?? '').trim().toUpperCase() || 'UNKNOWN';
  }

  protected get showingDetail(): boolean {
    return this.expandedAuditId() !== null;
  }

  protected get activeEvent(): AuditEventEntry | null {
    const id = this.expandedAuditId();
    if (id === null) return null;
    return this.events().find((e) => e.auditId === id) ?? null;
  }

  private collapseDetail(): void {
    this.expandedAuditId.set(null);
    this.detailData.set(null);
    this.detailLoading.set(null);
    this.detailError.set(null);
  }
}
