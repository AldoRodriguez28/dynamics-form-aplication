import { BusinessForm, BusinessFormBlock, FieldType, FormField } from '../models/form-schema.model';

export interface RequiredFieldSnapshot {
  blockCode: string;
  blockName?: string;
  rowNum?: number;
  fieldName: string;
  label?: string;
  path: string;
  required: boolean;
  value: unknown;
  missing: boolean;
}

/**
 * Extrae todos los campos marcados como `required` (incluye los definidos dentro de itemSchema)
 * y devuelve su valor actual junto con una bandera que indica si están vacíos.
 */
export function collectRequiredFields(schema: BusinessForm | BusinessFormBlock[]): RequiredFieldSnapshot[] {
  const blocks = Array.isArray(schema) ? schema : schema?.blocks ?? [];
  const snapshots: RequiredFieldSnapshot[] = [];
  const seen = new Set<string>();

  blocks.forEach((block) => {
    const values = block.values ?? {};
    const rows = block.rows ?? [];

    rows.forEach((row) => {
      row.fields?.forEach((field) => {
        if (field.required) {
          const path = field.name;
          const key = `${block.code}.${path}`;
          if (!seen.has(key)) {
            snapshots.push(buildSnapshot(block, row.num, field, values[field.name], path));
            seen.add(key);
          }
        }

        if (field.collection === 'array' && field.type === 'object' && field.itemSchema) {
          const items = normalizeObjectArray(values[field.name]);
          const itemEntries = Object.entries(field.itemSchema);

          items.forEach((item, itemIndex) => {
            itemEntries.forEach(([key, schemaField]) => {
              if (!schemaField?.required) return;
              const path = `${field.name}[${itemIndex}].${key}`;
              const compositeKey = `${block.code}.${path}`;
              if (seen.has(compositeKey)) return;
              snapshots.push(
                buildSnapshot(
                  block,
                  row.num,
                  { ...schemaField, name: key } as FormField,
                  item?.[key],
                  path
                )
              );
              seen.add(compositeKey);
            });
          });
        }
      });
    });
  });

  return snapshots;
}

export function findMissingRequiredFields(schema: BusinessForm | BusinessFormBlock[]): RequiredFieldSnapshot[] {
  return collectRequiredFields(schema).filter((field) => field.missing);
}

function buildSnapshot(
  block: BusinessFormBlock,
  rowNum: number | undefined,
  field: FormField,
  value: unknown,
  path: string
): RequiredFieldSnapshot {
  return {
    blockCode: block.code,
    blockName: block.name,
    rowNum,
    fieldName: field.name,
    label: field.label,
    path,
    required: true,
    value,
    missing: !hasValue(value, field.type)
  };
}

function normalizeObjectArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeObjectArray(parsed);
      } catch {
        return [];
      }
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => (isPlainObject(item) ? { ...item } : {}));
  }
  if (isPlainObject(value)) return [{ ...(value as Record<string, unknown>) }];
  return [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasValue(value: unknown, type?: FieldType): boolean {
  if (type === 'checkbox') return value === true;

  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;

  if (Array.isArray(value)) {
    return value.some((item) => hasValue(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => hasValue(v));
  }

  return true;
}
