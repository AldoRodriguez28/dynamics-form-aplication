export interface UploadFilesPayload {
  files: File | File[];
  businessId: string | number;
  versionNumber: number;
  fieldName: string;
  usage?: string;
  blockCode?: string;
}
