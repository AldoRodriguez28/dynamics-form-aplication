// models/blocks-response.model.ts
export class BlocksResponse {
  blocks!: Block[];
}

export class Block {
  code!: string;
  name!: string;
  rows!: Row[];

  // Propiedades adicionales del payload (opcionales)
  schemaVersion?: number;
  description?: string;
  order?: number;
  ui?: any;
  optionSets?: Record<string, OptionSet>;
  visibility?: Record<string, boolean>;
  values?: any;
}

export class Row {
  num!: number;
  fields!: Field[];
}

export class Field {
  name!: string;
  label!: string;
  type!: string;

  required?: boolean;
  placeholder?: string;
  colSpan?: number;
  collection?: 'single' | 'array';
  optionsRef?: string;
  itemSchema?: Record<string, FieldSchemaItem>;
  widget?: string;
  schema?: any;
}

export class FieldSchemaItem {
  label!: string;
  type!: string;
  required?: boolean;
  placeholder?: string;
  optionsRef?: string;
}

export class OptionSet {
  mode!: 'static' | 'api';
  items?: SelectOption[];
  source?: OptionSetSource;
}

export class SelectOption {
  value!: any;
  label!: string;
}

export class OptionSetSource {
  type!: 'api';
  method!: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint!: string;
  auth?: { type: 'BearerSecret'; secretName: string };
  valuePath?: string;
  labelPath?: string;
}
