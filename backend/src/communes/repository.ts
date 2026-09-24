import { Commune, CommuneInput } from "./types";

export interface CommuneRepository {
  count(): Promise<number>;
  bulkInsert(communes: CommuneInput[]): Promise<void>;
  findByPostalCode(postalCode: string): Promise<Commune[]>;
  search(query: string): Promise<Commune[]>;
}
