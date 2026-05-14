import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AuditEventDetail } from '../../../Interfaces/business/response/audit-event.response';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-detail.component.html',
  styleUrl: './audit-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditDetailComponent {
  @Input({ required: true }) detail!: AuditEventDetail;

  protected parsedDetail: ParsedDetail | null = null;

  ngOnChanges(): void {
    this.parsedDetail = this.parseDetailsJson(this.detail);
  }

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

  protected displayState(code: string | null | undefined): string {
    const c = (code ?? '').trim().toUpperCase();
    if (!c) return '—';
    return this.stateLabels[c] ?? c.replace(/_/g, ' ');
  }

  protected stateVariant(code: string | null | undefined): string {
    return (code ?? '').trim().toUpperCase() || 'UNKNOWN';
  }

  protected humanizeFieldName(name: string): string {
    return name
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());
  }

  protected renderFieldValueAsText(value: ParsedFieldValue): string {
    switch (value.type) {
      case 'empty':
        return '(vacío)';
      case 'text':
        return value.value;
      case 'url':
        return value.value;
      case 'file':
        return `Archivo #${value.fileId}`;
      case 'file-list':
        return value.files.map((f) => `Archivo #${f.fileId}`).join(', ');
      case 'list':
        return value.items.map((item) => this.renderFieldValueAsText(item)).join(', ');
      case 'key-value':
        return value.entries
          .map((e) => `${this.humanizeFieldName(e.key)}: ${this.renderFieldValueAsText(e.value)}`)
          .join(', ');
    }
  }

  // --- Parsing logic ---

  private parseDetailsJson(detail: AuditEventDetail): ParsedDetail {
    try {
      const raw = JSON.parse(detail.detailsJson);
      if (raw.oldSTATE !== undefined || raw.newSTATE !== undefined) {
        return {
          type: 'state-change',
          oldState: raw.oldSTATE ?? null,
          newState: raw.newSTATE ?? null,
          actorType: detail.actorType,
          actorId: detail.actorId,
        };
      }
      if (raw.oldContent !== undefined || raw.newContent !== undefined) {
        const oldFields = this.safeParseContent(raw.oldContent);
        const newFields = this.safeParseContent(raw.newContent);
        const changes = this.computeFieldChanges(oldFields, newFields);
        const snapshot = changes.length === 0
          ? this.buildContentSnapshot(Object.keys(newFields).length > 0 ? newFields : oldFields)
          : [];
        return {
          type: 'content-change',
          changes,
          snapshot,
          actorType: detail.actorType,
          actorId: detail.actorId,
        };
      }
      if (raw.newVersionId !== undefined || raw.newVersionNumber !== undefined) {
        return {
          type: 'version-creation',
          previousVersionId: raw.previousVersionId ?? null,
          newVersionId: raw.newVersionId ?? null,
          newVersionNumber: raw.newVersionNumber ?? null,
          actorType: detail.actorType,
          actorId: detail.actorId,
        };
      }
      return {
        type: 'generic',
        data: raw,
        actorType: detail.actorType,
        actorId: detail.actorId,
      };
    } catch {
      return {
        type: 'raw',
        raw: detail.detailsJson,
        actorType: detail.actorType,
        actorId: detail.actorId,
      };
    }
  }

  private safeParseContent(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'object') return value as Record<string, unknown>;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private computeFieldChanges(
    oldFields: Record<string, unknown>,
    newFields: Record<string, unknown>
  ): FieldChange[] {
    const allKeys = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);
    const changes: FieldChange[] = [];
    allKeys.forEach((key) => {
      const oldVal = oldFields[key];
      const newVal = newFields[key];
      const oldParsed = this.parseFieldValue(oldVal);
      const newParsed = this.parseFieldValue(newVal);
      if (JSON.stringify(oldParsed) !== JSON.stringify(newParsed)) {
        changes.push({ field: key, oldValue: oldParsed, newValue: newParsed });
      }
    });
    return changes;
  }

  private buildContentSnapshot(fields: Record<string, unknown>): ContentSnapshotEntry[] {
    return Object.entries(fields).map(([key, val]) => ({
      field: key,
      value: this.parseFieldValue(val),
    }));
  }

  private parseFieldValue(value: unknown): ParsedFieldValue {
    if (value === null || value === undefined || value === '') {
      return { type: 'empty' };
    }
    if (typeof value === 'string') {
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          const parsed = JSON.parse(value);
          return this.classifyParsedValue(parsed);
        } catch { /* not JSON */ }
      }
      if (/^https?:\/\//i.test(value)) {
        return { type: 'url', value };
      }
      return { type: 'text', value };
    }
    if (typeof value === 'boolean') {
      return { type: 'text', value: value ? 'Sí' : 'No' };
    }
    if (typeof value === 'number') {
      return { type: 'text', value: String(value) };
    }
    if (Array.isArray(value)) {
      return this.classifyArray(value);
    }
    if (typeof value === 'object') {
      return this.classifyObject(value as Record<string, unknown>);
    }
    return { type: 'text', value: String(value) };
  }

  private classifyParsedValue(value: unknown): ParsedFieldValue {
    if (value === null || value === undefined) return { type: 'empty' };
    if (Array.isArray(value)) return this.classifyArray(value);
    if (typeof value === 'object') return this.classifyObject(value as Record<string, unknown>);
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value)) return { type: 'url', value };
      return value ? { type: 'text', value } : { type: 'empty' };
    }
    return { type: 'text', value: String(value) };
  }

  private classifyArray(arr: unknown[]): ParsedFieldValue {
    if (arr.length === 0) return { type: 'empty' };
    const isFileList = arr.every(
      (item) => typeof item === 'object' && item !== null && 'file_id' in item && 'url' in item
    );
    if (isFileList) {
      return {
        type: 'file-list',
        files: arr.map((item: any) => ({ fileId: item.file_id, url: item.url })),
      };
    }
    return { type: 'list', items: arr.map((item) => this.classifyParsedValue(item)) };
  }

  private classifyObject(obj: Record<string, unknown>): ParsedFieldValue {
    if ('file_id' in obj && 'url' in obj) {
      return { type: 'file', fileId: obj['file_id'] as number, url: obj['url'] as string };
    }
    const entries = Object.entries(obj)
      .map(([k, v]) => ({ key: k, value: this.parseFieldValue(v) }));
    return { type: 'key-value', entries };
  }
}

export type ParsedDetail =
  | { type: 'state-change'; oldState: string | null; newState: string | null; actorType: string; actorId: string }
  | { type: 'content-change'; changes: FieldChange[]; snapshot: ContentSnapshotEntry[]; actorType: string; actorId: string }
  | { type: 'version-creation'; previousVersionId: number | null; newVersionId: number | null; newVersionNumber: number | null; actorType: string; actorId: string }
  | { type: 'generic'; data: unknown; actorType: string; actorId: string }
  | { type: 'raw'; raw: string; actorType: string; actorId: string };

export interface FieldChange {
  field: string;
  oldValue: ParsedFieldValue;
  newValue: ParsedFieldValue;
}

export type ParsedFieldValue =
  | { type: 'empty' }
  | { type: 'text'; value: string }
  | { type: 'url'; value: string }
  | { type: 'file'; fileId: number; url: string }
  | { type: 'file-list'; files: { fileId: number; url: string }[] }
  | { type: 'list'; items: ParsedFieldValue[] }
  | { type: 'key-value'; entries: { key: string; value: ParsedFieldValue }[] };

export interface ContentSnapshotEntry {
  field: string;
  value: ParsedFieldValue;
}
