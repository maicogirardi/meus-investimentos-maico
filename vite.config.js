import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ command, mode }) => ({
	plugins: [vue()],
	base: command === "serve" || mode === "firebase" ? "/" : "/meus-investimentos-maico/",
	define: {
		__APP_BUILD_ID__: JSON.stringify(new Date().toISOString()),
	},
	build: {
		assetsDir: "assets",
		sourcemap: false,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
}));

