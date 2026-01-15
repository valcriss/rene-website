import { createApp } from "vue";
import App from "./App.vue";
import { createAppRouter } from "./router";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const app = createApp(App);
app.use(createAppRouter());
app.mount("#app");
