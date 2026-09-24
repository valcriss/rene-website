export type CommuneInput = {
  codeInsee: string;
  codePostal: string;
  nomCommune: string;
  libelleAcheminement: string;
};

export type Commune = CommuneInput & {
  id: string;
};
