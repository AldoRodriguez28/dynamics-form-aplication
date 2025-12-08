import { BusinessRequest } from "./business.request";

export class CreateBusinesessRequest {
  creationReference!: string;
  legacyAdvertiserId!: string;
  businesses!: BusinessRequest[];
  contractFolio !: string;
}