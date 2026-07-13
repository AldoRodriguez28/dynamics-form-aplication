import { ExternalData } from '../models/external-data.model';

export const parseExternalData = (raw: unknown): ExternalData | null => {
  if (!raw) return null;
  if (typeof raw === 'object') {
    return raw as ExternalData;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as ExternalData;
      }
    } catch {
      return null;
    }
  }
  return null;
};

export const coerceExternalValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
};
