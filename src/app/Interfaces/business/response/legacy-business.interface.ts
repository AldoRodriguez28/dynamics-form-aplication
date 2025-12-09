import { BusinessInterface } from "./business.interface";

export interface LegacyBusinessInterface {
  legacyAdvertiserId?: string | null;
  businesses?: BusinessInterface[] | null;
}