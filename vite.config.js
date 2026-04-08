import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ command, mode }) => ({
	plugins: [vue()],
	base: command === "serve" || mode === "firebase" ? "/" : "/meus-investimentos-maico/",
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

