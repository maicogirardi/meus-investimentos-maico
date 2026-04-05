import { createApp } from "vue";
import App from "./App.vue";
import "./styles.css";
import { initializeFirebaseApp } from "./services/firebase";

initializeFirebaseApp();
createApp(App).mount("#app");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Service worker is optional during local bootstrap.
    });
  });
}

