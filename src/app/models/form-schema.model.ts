export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'checkbox-grid'
  | 'file'
  | 'list<object>'
  | string;

export interface FormField {
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  optionsSource?: string;
  dynamicFilter?: string;
  pattern?: string;
  allowedFormats?: string[];
  maxSizeMB?: number;
  placeholder?: string;
  rows?: number;
  options?: OptionItem[];
  description?: string;
  ui?: {
    columns?: number;
    compact?: boolean;
    layout?: string;
  };
  itemSchema?: Record<string, FormField>;
}

export interface FormSchema {
  schemaVersion: number;
  uiHints: {
    group: string;
    icon?: string;
    order: string[];
  };
  fields: Record<string, FormField>;
  visibility: Record<string, boolean>;
}

export interface OptionItem {
  value: string | number | boolean | null;
  label: string;
}

export interface BusinessFormBlock {
  code: string;
  values: Record<string, unknown>;
}

export interface BusinessForm {
  actorType: string;
  actorId: string;
  blocks: BusinessFormBlock[];
}
