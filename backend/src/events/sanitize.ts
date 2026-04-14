import sanitizeHtml from "sanitize-html";

export const sanitizeEventContent = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: ["p", "br", "a", "strong", "em", "u"],
    allowedAttributes: {
      a: ["href", "target", "rel"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
    }
  });

export const sanitizeEventPricingInfo = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: ["p", "br", "a", "strong", "em", "u", "ul", "ol", "li"],
    allowedAttributes: {
      a: ["href", "target", "rel"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" })
    }
  });
