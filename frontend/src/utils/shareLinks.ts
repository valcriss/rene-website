// Explicit share-intent URLs (issue #54). Each network's share endpoint takes the target page
// as a query parameter — no SDK/pixel and no network call happens until the visitor actually
// clicks one of these links (they simply navigate to the network's own share dialog).
export const buildFacebookShareUrl = (url: string): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

export const buildLinkedInShareUrl = (url: string): string =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

export const buildXShareUrl = (url: string, text: string): string =>
  `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
