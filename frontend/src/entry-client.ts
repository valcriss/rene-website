import { createApp } from "./appFactory";
import { useAuthStore } from "./stores/auth";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const { app, router, pinia } = createApp();

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
});
