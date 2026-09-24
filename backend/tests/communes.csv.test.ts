import { parseCommunesCsv } from "../src/communes/csv";

describe("parseCommunesCsv", () => {
  it("skips the header row and parses valid rows", () => {
    const content = [
      "code_postal;code_insee;nom_commune;libelle_acheminement",
      "37160;37069;Descartes;DESCARTES",
      "37000;37261;Tours;TOURS"
    ].join("\n");

    expect(parseCommunesCsv(content)).toEqual([
      { codePostal: "37160", codeInsee: "37069", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" },
      { codePostal: "37000", codeInsee: "37261", nomCommune: "Tours", libelleAcheminement: "TOURS" }
    ]);
  });

  it("ignores blank lines and trims whitespace around fields", () => {
    const content = "header\n\n  37160 ; 37069 ; Descartes ; DESCARTES  \n\n";

    expect(parseCommunesCsv(content)).toEqual([
      { codePostal: "37160", codeInsee: "37069", nomCommune: "Descartes", libelleAcheminement: "DESCARTES" }
    ]);
  });

  it("skips rows with a missing field", () => {
    const content = ["header", "37160;37069;;DESCARTES", ";37069;Descartes;DESCARTES"].join("\n");

    expect(parseCommunesCsv(content)).toEqual([]);
  });

  it("returns an empty list when there are no data rows", () => {
    expect(parseCommunesCsv("header")).toEqual([]);
    expect(parseCommunesCsv("")).toEqual([]);
  });
});
