<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
	theme: {
		type: String,
		default: "light",
	},
	themeColor: {
		type: String,
		default: "#4f7cff",
	},
	userEmail: {
		type: String,
		default: "",
	},
	isAuthenticated: {
		type: Boolean,
		default: false,
	},
	isSubmitting: {
		type: Boolean,
		default: false,
	},
	authError: {
		type: String,
		default: "",
	},
	canInstallApp: {
		type: Boolean,
		default: false,
	},
	isAppInstalled: {
		type: Boolean,
		default: false,
	},
	isInstallSupported: {
		type: Boolean,
		default: false,
	},
	isInstallingApp: {
		type: Boolean,
		default: false,
	},
});

const emit = defineEmits(["update-theme", "update-theme-color", "login", "logout", "install-app"]);

const isDarkMode = computed(() => props.theme === "dark");
const themeColorText = ref(props.themeColor);
const installHelpText = computed(() => {
	if (props.isAppInstalled) {
		return "O app já está instalado neste dispositivo.";
	}

	if (props.canInstallApp) {
		return "Toque no botão abaixo para instalar o app na tela inicial deste dispositivo.";
	}

	if (!props.isInstallSupported) {
		return "Se estiver no iPhone ou iPad, abra o menu Compartilhar do Safari e use “Adicionar à Tela de Início”.";
	}

	return "Se o botão não aparecer, recarregue a página e abra o menu do navegador para instalar manualmente.";
});

watch(
	() => props.themeColor,
	(value) => {
		themeColorText.value = value;
	},
);

function handleThemeColorChange(event) {
	const nextValue = event.target.value;
	themeColorText.value = nextValue;
	if (/^#[0-9A-Fa-f]{6}$/.test(nextValue)) {
		emit("update-theme-color", nextValue);
	}
}

function handleThemeColorTextBlur() {
	const nextValue = themeColorText.value.trim();
	if (/^#[0-9A-Fa-f]{6}$/.test(nextValue)) {
		emit("update-theme-color", nextValue);
	}
}

function handleThemeToggle(event) {
	const checked = event.target.checked;
	emit("update-theme", checked ? "dark" : "light");
}
</script>

<template>
	<section class="page-section settings-view">
		<header class="settings-header">
			<h2>Configurações</h2>
		</header>

		<div class="settings-card">
			<div class="settings-row">
				<div class="settings-copy">
					<label class="settings-label" for="dark-mode-switch">Dark mode</label>
					<p class="settings-help">Alterna entre light e dark mode.</p>
				</div>

				<label class="switch" for="dark-mode-switch">
					<input
						id="dark-mode-switch"
						:checked="isDarkMode"
						type="checkbox"
						@change="handleThemeToggle"
					/>
					<span class="switch-track" />
					<span class="switch-thumb" />
				</label>
			</div>
		</div>

		<div class="settings-card">
			<div class="field-group">
				<label class="settings-label" for="theme-color-picker">Cor do tema</label>
				<div class="color-field">
					<input
						id="theme-color-picker"
						class="color-picker"
						type="color"
						:value="themeColorText"
						@change="handleThemeColorChange"
					/>
					<input
						v-model="themeColorText"
						class="color-code-input"
						type="text"
						maxlength="7"
						@blur="handleThemeColorTextBlur"
						placeholder="#AA3BFF"
					/>
				</div>
			</div>
		</div>

		<div class="settings-card">
			<div class="settings-copy">
				<label class="settings-label">Instalar app</label>
				<p class="settings-help">{{ installHelpText }}</p>
			</div>

			<div class="settings-actions">
				<button
					v-if="canInstallApp"
					:disabled="isSubmitting || isInstallingApp"
					type="button"
					@click="$emit('install-app')"
				>
					{{ isInstallingApp ? "Abrindo instalador..." : "Instalar app" }}
				</button>
				<button
					v-else
					disabled
					type="button"
				>
					{{ isAppInstalled ? "App instalado" : "Instalação indisponível" }}
				</button>
			</div>
		</div>

		<div class="settings-card">
			<div class="settings-copy">
				<label class="settings-label">Conta</label>
				<p class="settings-help">
					{{ isAuthenticated ? `Logado como: ${userEmail}.` : "Nenhuma conta conectada." }}
				</p>
				<p v-if="authError" class="settings-error">{{ authError }}</p>
			</div>

			<div class="settings-actions">
				<button
					v-if="!isAuthenticated"
					:disabled="isSubmitting"
					type="button"
					@click="$emit('login')"
				>
					Entrar com Google
				</button>
				<button
					v-else
					class="logout-button"
					:disabled="isSubmitting"
					type="button"
					@click="$emit('logout')"
				>
					Encerrar sessão
				</button>
			</div>
		</div>
	</section>
</template>

<style scoped>
.settings-view {
	display: grid;
	width: 100%;
	gap: 16px;
	padding: 16px;
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
	box-sizing: border-box;
}

.settings-header h2 {
	margin: 0;
}

.settings-card {
	display: grid;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--input-border);
	border-radius: 20px;
	background: var(--glass-surface-strong);
	backdrop-filter: blur(22px);
}

.settings-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.settings-copy {
	display: grid;
	gap: 4px;
}

.settings-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-h);
}

.settings-help {
	font-size: 12px;
	color: var(--text);
}

.settings-error {
	margin: 0;
	font-size: 12px;
	color: #b91c1c;
}

.field-group {
	width: 100%;
}

.color-field {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	margin-top: 10px;
	border: 1px solid var(--glass-border);
	border-radius: 16px;
	background: var(--input-surface);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.color-picker {
	width: 46px;
	min-width: 46px;
	height: 46px;
	padding: 0;
	border: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--glass-border-strong));
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface-strong));
	cursor: pointer;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.3),
		0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, transparent);
	overflow: hidden;
}

.color-picker::-webkit-color-swatch-wrapper {
	padding: 3px;
	border-radius: 999px;
}

.color-picker::-webkit-color-swatch {
	border: 0;
	border-radius: 999px;
}

.color-picker::-moz-color-swatch {
	border: 0;
	border-radius: 999px;
}

.color-picker:focus-visible {
	border-color: var(--input-focus-border);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.3),
		0 0 0 4px var(--input-focus-ring);
}

.color-code-input {
	flex: 1;
	min-width: 0;
	height: 40px;
	padding: 0 14px;
	border: 1px solid var(--input-border);
	border-radius: 12px;
	background: color-mix(in srgb, var(--input-surface) 88%, transparent);
	color: var(--input-text);
	font: inherit;
	outline: none;
	transition:
		border-color 0.18s ease,
		background 0.18s ease,
		box-shadow 0.18s ease,
		color 0.18s ease;
}

.color-code-input::placeholder {
	color: var(--input-placeholder);
}

.color-code-input:focus-visible {
	border-color: var(--input-focus-border);
	background: color-mix(in srgb, var(--input-surface) 96%, transparent);
	box-shadow: 0 0 0 4px var(--input-focus-ring);
}

.settings-actions {
	display: flex;
	justify-content: flex-start;
}

.settings-actions button {
	padding: 10px 14px;
	position: relative;
	overflow: hidden;
	border: 1px solid var(--theme-button-border);
	border-radius: 16px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: var(--text-soft);
	font: inherit;
	font-weight: 600;
	cursor: pointer;
	outline: none;
	appearance: none;
	-webkit-appearance: none;
	-webkit-tap-highlight-color: transparent;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	transition:
		transform 0.18s ease,
		background 0.18s ease,
		border-color 0.18s ease,
		color 0.18s ease,
		opacity 0.18s ease;
}

.settings-actions button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

.settings-actions button:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 54%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.settings-actions button:active:not(:disabled) {
	transform: translateY(0);
	border-color: color-mix(in srgb, var(--color-primary) 58%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.settings-actions button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.settings-actions .logout-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.settings-actions .logout-button:hover {
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	border-color: var(--danger-border-strong);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.settings-actions .logout-button:focus-visible,
.settings-actions .logout-button:active:not(:disabled) {
	border-color: var(--danger-border-strong);
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--danger-text) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.switch {
	position: relative;
	width: 54px;
	height: 32px;
	display: inline-flex;
	align-items: center;
	cursor: pointer;
}

.switch input {
	position: absolute;
	inset: 0;
	opacity: 0;
	cursor: pointer;
}

.switch-track {
	width: 100%;
	height: 100%;
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-primary) 22%, var(--color-bg));
	border: 1px solid var(--border);
	transition: background 0.2s ease;
}

.switch-thumb {
	position: absolute;
	left: 4px;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: var(--color-bg);
	box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
	transition: transform 0.2s ease, background 0.2s ease;
}

.switch input:checked + .switch-track {
	background: var(--color-primary);
}

.switch input:checked + .switch-track + .switch-thumb {
	transform: translateX(22px);
	background: var(--color-text-on-primary, #ffffff);
}

.switch input:focus-visible + .switch-track {
	border-color: var(--input-focus-border);
	box-shadow: 0 0 0 4px var(--input-focus-ring);
}
</style>
