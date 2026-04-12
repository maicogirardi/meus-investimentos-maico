import { createApp } from "vue";
import "./styles/variables.css";
import "./styles/theme.css";
import "./style.css";
import App from "./App.vue";
import { initializeFirebaseApp } from "./services/firebase";

initializeFirebaseApp();
createApp(App).mount("#app");

if ("serviceWorker" in navigator && import.meta.env.PROD) {
	window.addEventListener("load", async () => {
		try {
			const baseUrl = import.meta.env.BASE_URL;
			const serviceWorkerUrl = `${baseUrl}sw.js?v=${encodeURIComponent(__APP_BUILD_ID__)}`;
			const startupTime = Date.now();
			const startupUpdateWindowMs = 15000;
			let hasRefreshingController = false;
			const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
				scope: baseUrl,
			});

			navigator.serviceWorker.addEventListener("controllerchange", () => {
				if (hasRefreshingController) {
					return;
				}

				hasRefreshingController = true;
				window.location.reload();
			});

			const shouldApplyUpdateImmediately = () => Date.now() - startupTime <= startupUpdateWindowMs;
			const activateUpdate = (worker) => {
				worker?.postMessage({ type: "SKIP_WAITING" });
			};

			const notifyUpdate = (worker) => {
				if (shouldApplyUpdateImmediately()) {
					activateUpdate(worker);
					return;
				}

				window.dispatchEvent(
					new CustomEvent("app-update-available", {
						detail: {
							update: () => activateUpdate(worker),
						},
					}),
				);
			};

			if (registration.waiting) {
				notifyUpdate(registration.waiting);
			}

			void registration.update();

			registration.addEventListener("updatefound", () => {
				const installingWorker = registration.installing;
				if (!installingWorker) {
					return;
				}

				installingWorker.addEventListener("statechange", () => {
					if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
						notifyUpdate(installingWorker);
					}
				});
			});
		} catch (error) {
			console.error("Falha ao registrar o service worker", error);
		}
	});
}
