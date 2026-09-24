import { slugify } from "../src/utils/slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Descartes")).toBe("descartes");
    expect(slugify("La Celle-Guenand")).toBe("la-celle-guenand");
  });

  it("strips accents", () => {
    expect(slugify("Créteil")).toBe("creteil");
  });

  it("trims leading/trailing whitespace", () => {
    expect(slugify(" Saint-Épain ")).toBe("saint-epain");
  });

  it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
    expect(slugify("Tours  &  Environs")).toBe("tours-environs");
  });
});
