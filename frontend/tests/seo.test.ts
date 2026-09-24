import { buildPlainTextDescription, DEFAULT_OG_IMAGE_PATH, toAbsoluteUrl } from "../src/utils/seo";

describe("toAbsoluteUrl", () => {
  it("resolves a relative path against the site URL", () => {
    expect(toAbsoluteUrl("https://rene.example.org", "/uploads/photo.jpg")).toBe(
      "https://rene.example.org/uploads/photo.jpg"
    );
  });

  it("leaves an already-absolute URL unchanged", () => {
    expect(toAbsoluteUrl("https://rene.example.org", "https://cdn.example.com/img.png")).toBe(
      "https://cdn.example.com/img.png"
    );
    expect(toAbsoluteUrl("https://rene.example.org", "http://cdn.example.com/img.png")).toBe(
      "http://cdn.example.com/img.png"
    );
  });

  it("falls back to returning the input unchanged when there is no site URL", () => {
    expect(toAbsoluteUrl("", "/uploads/photo.jpg")).toBe("/uploads/photo.jpg");
  });

  it("falls back to the input when the site URL is malformed", () => {
    expect(toAbsoluteUrl("not a url", "/uploads/photo.jpg")).toBe("/uploads/photo.jpg");
  });

  it("resolves the default OG image against the site URL", () => {
    expect(toAbsoluteUrl("https://rene.example.org", DEFAULT_OG_IMAGE_PATH)).toBe(
      "https://rene.example.org/logo.svg"
    );
  });
});

describe("buildPlainTextDescription", () => {
  it("returns an empty string for missing content", () => {
    expect(buildPlainTextDescription(null)).toBe("");
    expect(buildPlainTextDescription(undefined)).toBe("");
    expect(buildPlainTextDescription("")).toBe("");
  });

  it("strips tags and collapses whitespace", () => {
    expect(buildPlainTextDescription("<p>Bonjour   <strong>le monde</strong></p>")).toBe("Bonjour le monde");
  });

  it("decodes numeric and common named HTML entities", () => {
    expect(buildPlainTextDescription("Caf&#233; &amp; th&#233; d&#39;ici")).toBe("Café & thé d'ici");
    expect(buildPlainTextDescription("<p>Guillemets&nbsp;&quot;test&quot;</p>")).toBe('Guillemets "test"');
  });

  it("passes accented/special UTF-8 characters through unchanged", () => {
    expect(buildPlainTextDescription("<p>Événement à Descartes : café, thé & pâtisseries</p>")).toBe(
      "Événement à Descartes : café, thé & pâtisseries"
    );
  });

  it("truncates on a word boundary and appends an ellipsis", () => {
    const longText = "Un concert exceptionnel se déroulera dans le kiosque du parc municipal ce week-end avec plusieurs artistes locaux et une restauration sur place";
    const result = buildPlainTextDescription(longText, 60);

    expect(result.length).toBeLessThanOrEqual(61);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });

  it("does not truncate content shorter than the limit", () => {
    expect(buildPlainTextDescription("<p>Court texte.</p>", 160)).toBe("Court texte.");
  });

  it("falls back to a hard cut when there is no word boundary to truncate at", () => {
    const noSpaces = "a".repeat(200);
    const result = buildPlainTextDescription(noSpaces, 50);

    expect(result).toBe(`${"a".repeat(50)}…`);
  });
});
