export interface BusinessVersionDetailResponse {
  businessVersionId: number;
  versionNumber: number;
  scope: string;
  state: string;
  basedOnVersionId: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  sourceApp: string | null;
  externalData?: string | null;
  businessName?: string | null;
  legacyAdvertiserId?: number | string | null;
  categoryName?: string | null;
  townName?: string | null;
}
