import { createHead } from "@unhead/vue/client";
import { createApp } from "./appFactory";
import { useAuthStore } from "./stores/auth";
import { getSavedLocale, setLocale } from "./i18n";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const { app, router, pinia } = createApp(createHead);

const stateElement = document.getElementById("__PINIA_STATE__");
if (stateElement?.textContent) {
  try {
    pinia.state.value = JSON.parse(stateElement.textContent);
  } catch {
    // Malformed or missing SSR state: the client simply fetches its own data as it always did.
  }
}

Promise.all([router.isReady(), useAuthStore(pinia).restoreSession()]).then(() => {
  app.mount("#app");

  // Applied only now, after hydration has completed against the server's French markup: a
  // saved preference switches the locale via a normal reactive update instead of feeding
  // hydration a locale the server never rendered.
  const savedLocale = getSavedLocale();
  if (savedLocale) {
    setLocale(savedLocale);
  }
});
