// Font Awesome reads `window.FontAwesomeConfig` when its core module is first evaluated. Its
// stylesheet is imported into a Tailwind cascade layer from styles.css; letting the library also
// inject its own unlayered copy at runtime would override utilities such as h-4 w-4 (unlayered CSS
// beats every layer). Setting the global here, rather than importing the core's `config` object,
// keeps the (large) core out of the entry chunk. Import this module before any Font Awesome code.
(globalThis as { FontAwesomeConfig?: Record<string, unknown> }).FontAwesomeConfig = { autoAddCss: false };

export {};
