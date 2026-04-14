import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { createAppRouter } from "./router";
import { installI18n } from "./i18n";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const app = createApp(App);
app.use(createPinia());
app.use(createAppRouter());
installI18n(app);
app.mount("#app");
