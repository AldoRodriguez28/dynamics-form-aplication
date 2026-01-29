import { OptionItemInterface } from "../dynamic-form/interface/OptionItem.intreface";

export type FieldType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'checkbox-group'
  | 'checkbox'
  | 'file'
  | 'email'
  | 'tel'
  | 'url'
  | 'time'
  | 'opening_hours'
  | 'object'
  | 'string'
  | string;

export type FieldCollection = 'single' | 'array';


export interface OptionSetSource {
  type: string;
  method: string;
  endpoint: string;
  auth?: Record<string, string>;
  valuePath?: string;
  labelPath?: string;
}

export interface OptionSet {
  mode: 'static' | 'api';
  items?: OptionItemInterface[];
  source?: OptionSetSource;
}

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  pattern?: string;
  colSpan?: number;
  collection?: FieldCollection;
  optionsRef?: string;
  widget?: string;
  itemSchema?: Record<
    string,
    {
      label: string;
      type: FieldType;
      required?: boolean;
      placeholder?: string;
      optionsRef?: string;
    }
  >;
  schema?: Record<string, unknown>;
  description?: string;
  rows?: number;
  allowedFormats?: string[];
  maxSizeMB?: number;
  ui?: {
    columns?: number;
    compact?: boolean;
    layout?: string;
  };
  enforceCompleteAddress?:boolean;
}

export interface FormRow {
  num: number;
  fields: FormField[];
}

export interface BlockUI {
  icon?: string;
  collapsible?: boolean;
  startOpen?: boolean;
}

export interface BusinessFormBlock {
  code: string;
  schemaVersion?: number;
  name?: string;
  description?: string;
  order?: number;
  ui?: BlockUI;
  optionSets?: Record<string, OptionSet>;
  rows: FormRow[];
  values: Record<string, unknown>;
  readOnlyRoles?: string[];
  visibility?: Record<string, boolean>;
}

export interface BusinessForm {
  businessId?: string | number;
  businessVersion?: number;
  versionNumber?: number;
  advertiserId?: string | number;
  commercialName?: string;
  actorType?: string;
  actorId?: string;
  status?: FormStatus;
  blocks: BusinessFormBlock[];
}

export type FormStatus = 'draft' | 'in-progress' | 'content_in_creation' | 'ready' | 'locked' | string;

// Legacy schema kept for reference (no longer used directly in render).
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
