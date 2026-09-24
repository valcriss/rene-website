import { buildFacebookShareUrl, buildLinkedInShareUrl, buildXShareUrl } from "../src/utils/shareLinks"; // gitleaks:allow

describe("shareLinks", () => {
  const url = "https://rene.example.org/evenements/concert-descartes-2026?ref=test&x=1";

  it("builds a Facebook share URL with the encoded target URL", () => {
    expect(buildFacebookShareUrl(url)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    );
  });

  it("builds a LinkedIn share URL with the encoded target URL", () => {
    expect(buildLinkedInShareUrl(url)).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    );
  });

  it("builds an X share URL with the encoded target URL and text", () => {
    const text = "Concert & fête, à ne pas manquer !";
    expect(buildXShareUrl(url, text)).toBe(
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    );
  });

  it("percent-encodes reserved characters so the query string stays well-formed", () => {
    const withReserved = "https://rene.example.org/evenements/foo?a=b&c=d";
    const shareUrl = buildFacebookShareUrl(withReserved);
    expect(shareUrl).not.toContain("&c=d");
    expect(shareUrl).toContain(encodeURIComponent(withReserved));
  });
});
