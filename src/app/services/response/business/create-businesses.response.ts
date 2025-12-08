import { BusinessResponse } from "./business.response";

export class CreateBusinesessResponse {
  advertiserId!: string;
  legacyAdvertiserId!: string;
  businesses!: BusinessResponse[];
}
