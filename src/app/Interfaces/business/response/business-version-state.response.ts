export interface BusinessVersionStateResponse {
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
}
