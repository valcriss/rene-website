import { createApp } from "./appFactory";
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

router.isReady().then(() => {
  app.mount("#app");
});
