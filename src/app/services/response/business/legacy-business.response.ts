import { BusinessResponse } from "./business.response";

export class LegacyBusinessResponse {
  legacyAdvertiserId!: string;
  businesses!: BusinessResponse[];
}
