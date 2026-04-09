<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import BottomTabs from "./components/navigation/BottomTabs.vue";
import AppSelect from "./components/ui/AppSelect.vue";
import { appMeta } from "./config/appConfig";
import AppLayout from "./layout/AppLayout.vue";
import { createAssetWithMonthlyState, deleteAssetCascade, subscribeAssets, updateAssetWithInitialMonthlyState } from "./services/assets";
import { buildPeriodId, ensurePeriod, subscribePeriods } from "./services/periods";
import { getFirebaseAuth, getFirebaseDb } from "./services/firebase";
import AtivosView from "./views/AtivosView.vue";
import ConfiguracoesView from "./views/ConfiguracoesView.vue";
import HomeView from "./views/HomeView.vue";
import ResumoView from "./views/ResumoView.vue";

const auth = getFirebaseAuth();
const db = getFirebaseDb();
const provider = new GoogleAuthProvider();
const today = new Date();
const defaultPeriod = Object.freeze({
	year: 2026,
	month: 4,
	label: "Abril de 2026",
});

const status = ref("idle");
const errorMessage = ref("");
const currentUser = ref(null);
const authReady = ref(false);
const isUpdateAvailable = ref(false);
const currentPage = ref("home");
const userPreferences = ref({ darkMode: true, themeColor: "#4f7cff" });
const hasLoadedUiPreferences = ref(false);
const hasLoadedPeriods = ref(false);
const hasLoadedAssets = ref(false);
const preferredPeriod = ref({ year: null, month: null });
const selectedYear = ref(null);
const selectedMonth = ref(null);
const periods = ref([]);
const assets = ref([]);
const isPeriodModalOpen = ref(false);
const isDeletePeriodModalOpen = ref(false);
const periodModalYear = ref(today.getFullYear());
const periodModalMonth = ref(today.getMonth() + 1);
const assetErrorMessage = ref("");

let unsubscribeAuth = null;
let unsubscribePreferences = null;
let unsubscribePeriods = null;
let unsubscribeAssets = null;
let triggerAppUpdate = null;
let isCreatingDefaultPeriod = false;

const monthOptions = Object.freeze([
	{ value: 1, label: "Janeiro" },
	{ value: 2, label: "Fevereiro" },
	{ value: 3, label: "Março" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Maio" },
	{ value: 6, label: "Junho" },
	{ value: 7, label: "Julho" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Setembro" },
	{ value: 10, label: "Outubro" },
	{ value: 11, label: "Novembro" },
	{ value: 12, label: "Dezembro" },
]);

const modalYearOptions = computed(() => {
	const currentYear = today.getFullYear();
	return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map((year) => ({
		value: year,
		label: String(year),
	}));
});

const isAuthenticated = computed(() => Boolean(currentUser.value));
const isSubmitting = computed(() => status.value === "loading");
const theme = computed(() => (userPreferences.value.darkMode !== false ? "dark" : "light"));
const currentColor = computed(() => userPreferences.value.themeColor || "#4f7cff");
const selectedPeriodId = computed(() => {
	if (!Number.isInteger(selectedYear.value) || !Number.isInteger(selectedMonth.value)) {
		return "";
	}

	return buildPeriodId(selectedYear.value, selectedMonth.value);
});
const selectedPeriod = computed(() =>
	periods.value.find((period) => period.id === selectedPeriodId.value) || null,
);
const yearOptions = computed(() =>
	Array.from(new Set([...periods.value.map((period) => period.year), selectedYear.value].filter(Number.isInteger)))
		.sort((a, b) => b - a)
		.map((year) => ({ value: year, label: String(year) })),
);
const availableMonths = computed(() => {
	if (!Number.isInteger(selectedYear.value)) {
		return [];
	}

	const months = Array.from(
		new Set(
			periods.value
				.filter((period) => period.year === selectedYear.value)
				.map((period) => period.month),
		),
	).sort((a, b) => a - b);

	if (months.length === 0 && selectedYear.value === defaultPeriod.year) {
		return monthOptions.filter((option) => option.value === defaultPeriod.month);
	}

	return monthOptions.filter((option) => months.includes(option.value));
});
const periodLabel = computed(() => {
	if (selectedPeriod.value?.label) {
		return selectedPeriod.value.label;
	}

	if (Number.isInteger(selectedYear.value) && Number.isInteger(selectedMonth.value)) {
		return buildMonthLabel(selectedYear.value, selectedMonth.value);
	}

	return "";
});
const isDataReady = computed(() =>
	authReady.value &&
	(!isAuthenticated.value || (hasLoadedUiPreferences.value && hasLoadedPeriods.value && hasLoadedAssets.value)),
);
const navigationTabs = computed(() => {
	if (!isAuthenticated.value) {
		return [{ value: "settings", label: "Configurações", icon: "settings" }];
	}

	return [
		{ value: "home", label: "Início", icon: "home" },
		{ value: "summary", label: "Resumo", icon: "wallet" },
		{ value: "assets", label: "Ativos", icon: "grid" },
		{ value: "settings", label: "Configurações", icon: "settings" },
	];
});

function hexToRgb(hexColor) {
	const normalized = String(hexColor || "").trim().replace("#", "");

	if (!/^[\da-fA-F]{6}$/.test(normalized)) {
		return null;
	}

	return {
		r: Number.parseInt(normalized.slice(0, 2), 16),
		g: Number.parseInt(normalized.slice(2, 4), 16),
		b: Number.parseInt(normalized.slice(4, 6), 16),
	};
}

function mixHex(hexColor, target, weight) {
	const base = hexToRgb(hexColor);
	if (!base) {
		return hexColor;
	}

	const clampWeight = Math.max(0, Math.min(1, weight));
	const mixed = {
		r: Math.round(base.r + (target.r - base.r) * clampWeight),
		g: Math.round(base.g + (target.g - base.g) * clampWeight),
		b: Math.round(base.b + (target.b - base.b) * clampWeight),
	};

	return `#${[mixed.r, mixed.g, mixed.b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function syncBrowserThemeColor(activeTheme) {
	const themeColorMeta = document.querySelector('meta[name="theme-color"]');
	if (!themeColorMeta) {
		return;
	}

	themeColorMeta.setAttribute("content", activeTheme === "dark" ? "#08111f" : "#f3f7ff");
}

function userConfigDoc(uid) {
	return doc(db, "users", uid, "configs", "preferences");
}

function normalizeStoredYear(value) {
	const normalized = Number(value);
	return Number.isInteger(normalized) && normalized >= 2000 ? normalized : null;
}

function normalizeStoredMonth(value) {
	const normalized = Number(value);
	return Number.isInteger(normalized) && normalized >= 1 && normalized <= 12 ? normalized : null;
}

function applyTheme() {
	const activeTheme = theme.value;
	const accent = currentColor.value;

	document.documentElement.setAttribute("data-theme", activeTheme);
	document.documentElement.style.setProperty("--color-primary", accent);
	document.documentElement.style.setProperty("--color-primary-soft", mixHex(accent, { r: 255, g: 255, b: 255 }, 0.45));
	document.documentElement.style.setProperty("--theme-accent", accent);
	syncBrowserThemeColor(activeTheme);
}

function buildMonthLabel(year, month) {
	const monthEntry = monthOptions.find((option) => option.value === month);
	return monthEntry ? `${monthEntry.label} de ${year}` : String(year);
}

function periodExists(year, month) {
	return periods.value.some((period) => period.year === year && period.month === month);
}

function resolveSelectedPeriod() {
	if (periods.value.length === 0) {
		selectedYear.value = preferredPeriod.value.year ?? defaultPeriod.year;
		selectedMonth.value = preferredPeriod.value.month ?? defaultPeriod.month;
		return;
	}

	if (periodExists(preferredPeriod.value.year, preferredPeriod.value.month)) {
		selectedYear.value = preferredPeriod.value.year;
		selectedMonth.value = preferredPeriod.value.month;
		return;
	}

	if (periodExists(selectedYear.value, selectedMonth.value)) {
		return;
	}

	const latestPeriod = periods.value[periods.value.length - 1];
	selectedYear.value = latestPeriod.year;
	selectedMonth.value = latestPeriod.month;
}

async function ensureDefaultStartingPeriod(uid) {
	if (!uid || periods.value.length > 0 || isCreatingDefaultPeriod) {
		return;
	}

	isCreatingDefaultPeriod = true;

	try {
		await ensurePeriod(uid, defaultPeriod.year, defaultPeriod.month, defaultPeriod.label);
	} finally {
		isCreatingDefaultPeriod = false;
	}
}

async function savePreferences(patch) {
	if (!currentUser.value || !db) {
		return;
	}

	const payload = {
		uid: currentUser.value.uid,
		updatedAt: serverTimestamp(),
	};

	if (Object.prototype.hasOwnProperty.call(patch, "darkMode")) {
		userPreferences.value = { ...userPreferences.value, darkMode: patch.darkMode };
		payload.darkMode = patch.darkMode;
	}

	if (Object.prototype.hasOwnProperty.call(patch, "themeColor")) {
		userPreferences.value = { ...userPreferences.value, themeColor: patch.themeColor };
		payload.themeColor = patch.themeColor;
	}

	if (Object.prototype.hasOwnProperty.call(patch, "selectedYear")) {
		payload.selectedYear = normalizeStoredYear(patch.selectedYear);
	}

	if (Object.prototype.hasOwnProperty.call(patch, "selectedMonth")) {
		payload.selectedMonth = normalizeStoredMonth(patch.selectedMonth);
	}

	applyTheme();

	try {
		await setDoc(userConfigDoc(currentUser.value.uid), payload, { merge: true });
	} catch {
		errorMessage.value = "Não foi possível salvar a preferência agora.";
	}
}

function listenPreferences(uid) {
	if (!db) {
		hasLoadedUiPreferences.value = true;
		return;
	}

	hasLoadedUiPreferences.value = false;
	unsubscribePreferences?.();
	unsubscribePreferences = onSnapshot(userConfigDoc(uid), async (snapshot) => {
		if (!snapshot.exists()) {
			hasLoadedUiPreferences.value = true;
			await savePreferences(userPreferences.value);
			return;
		}

		const data = snapshot.data();
		userPreferences.value = {
			darkMode: data.darkMode !== false,
			themeColor: data.themeColor || "#4f7cff",
		};
		preferredPeriod.value = {
			year: normalizeStoredYear(data.selectedYear),
			month: normalizeStoredMonth(data.selectedMonth),
		};
		applyTheme();
		resolveSelectedPeriod();
		hasLoadedUiPreferences.value = true;
	});
}

function listenPeriods(uid) {
	hasLoadedPeriods.value = false;
	unsubscribePeriods?.();
	unsubscribePeriods = subscribePeriods(uid, async (nextPeriods) => {
		periods.value = nextPeriods;
		resolveSelectedPeriod();
		hasLoadedPeriods.value = true;

		if (nextPeriods.length === 0) {
			await ensureDefaultStartingPeriod(uid);
		}
	});
}

function listenAssets(uid) {
	hasLoadedAssets.value = false;
	unsubscribeAssets?.();
	unsubscribeAssets = subscribeAssets(uid, (nextAssets) => {
		assets.value = nextAssets;
		hasLoadedAssets.value = true;
	});
}

async function handleGoogleSignIn() {
	if (!auth) {
		errorMessage.value = "Firebase não inicializado. Verifique a configuração do projeto.";
		return;
	}

	status.value = "loading";
	errorMessage.value = "";

	try {
		await signInWithPopup(auth, provider);
	} catch {
		errorMessage.value = "Não foi possível autenticar com Google.";
	} finally {
		status.value = "idle";
	}
}

async function handleSignOut() {
	if (!auth) {
		return;
	}

	status.value = "loading";

	try {
		await signOut(auth);
	} finally {
		status.value = "idle";
	}
}

function handleAppUpdateAvailable(event) {
	triggerAppUpdate = typeof event.detail?.update === "function" ? event.detail.update : null;
	isUpdateAvailable.value = true;
}

function reloadWithNewVersion() {
	if (!triggerAppUpdate) {
		window.location.reload();
		return;
	}

	triggerAppUpdate();
}

function clearUserState() {
	unsubscribePreferences?.();
	unsubscribePeriods?.();
	unsubscribeAssets?.();
	periods.value = [];
	assets.value = [];
	hasLoadedUiPreferences.value = false;
	hasLoadedPeriods.value = false;
	hasLoadedAssets.value = false;
	preferredPeriod.value = { year: null, month: null };
	userPreferences.value = { darkMode: true, themeColor: "#4f7cff" };
	selectedYear.value = defaultPeriod.year;
	selectedMonth.value = defaultPeriod.month;
	currentPage.value = "settings";
	isPeriodModalOpen.value = false;
	isDeletePeriodModalOpen.value = false;
	assetErrorMessage.value = "";
	applyTheme();
}

function handleTabSelection(nextPage) {
	if (!isAuthenticated.value && nextPage !== "settings") {
		currentPage.value = "settings";
		return;
	}

	currentPage.value = nextPage;
}

function openPeriodModal() {
	periodModalYear.value = selectedYear.value || today.getFullYear();
	periodModalMonth.value = selectedMonth.value || today.getMonth() + 1;
	isPeriodModalOpen.value = true;
}

function closePeriodModal() {
	isPeriodModalOpen.value = false;
}

function openDeletePeriodModal() {
	if (!selectedPeriod.value || !currentUser.value) {
		return;
	}

	isDeletePeriodModalOpen.value = true;
}

function closeDeletePeriodModal() {
	if (status.value === "loading") {
		return;
	}

	isDeletePeriodModalOpen.value = false;
}

function getActiveModalActions() {
	if (isPeriodModalOpen.value) {
		return {
			confirm: savePeriod,
			cancel: closePeriodModal,
		};
	}

	if (isDeletePeriodModalOpen.value) {
		return {
			confirm: confirmDeleteSelectedPeriod,
			cancel: closeDeletePeriodModal,
		};
	}

	return null;
}

function isKeyboardShortcutTargetBlocked() {
	const activeElement = document.activeElement;

	if (!(activeElement instanceof HTMLElement)) {
		return false;
	}

	const tagName = activeElement.tagName;

	return (
		activeElement.isContentEditable ||
		tagName === "INPUT" ||
		tagName === "TEXTAREA" ||
		tagName === "SELECT" ||
		tagName === "BUTTON" ||
		tagName === "A"
	);
}

function handleModalKeydown(event) {
	if (isSubmitting.value) {
		return;
	}

	const modalActions = getActiveModalActions();
	if (!modalActions) {
		return;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		modalActions.cancel();
		return;
	}

	if (event.key !== "Enter" || event.shiftKey || isKeyboardShortcutTargetBlocked()) {
		return;
	}

	event.preventDefault();
	void modalActions.confirm();
}

async function savePeriod() {
	if (!currentUser.value || !Number.isInteger(periodModalYear.value) || !Number.isInteger(periodModalMonth.value)) {
		return;
	}

	status.value = "loading";

	try {
		if (!periodExists(periodModalYear.value, periodModalMonth.value)) {
			await ensurePeriod(
				currentUser.value.uid,
				periodModalYear.value,
				periodModalMonth.value,
				buildMonthLabel(periodModalYear.value, periodModalMonth.value),
			);
		}

		selectedYear.value = periodModalYear.value;
		selectedMonth.value = periodModalMonth.value;
		closePeriodModal();
	} finally {
		status.value = "idle";
	}
}

async function deleteSelectedPeriod() {
	if (!selectedPeriod.value || !currentUser.value) {
		return;
	}

	const shouldDelete = window.confirm(`Excluir o mês ${selectedPeriod.value.label}?`);
	if (!shouldDelete) {
		return;
	}

	status.value = "loading";

	try {
		await deleteDoc(doc(db, "users", currentUser.value.uid, "periods", selectedPeriod.value.id));
	} finally {
		status.value = "idle";
	}
}

async function confirmDeleteSelectedPeriod() {
	if (!selectedPeriod.value || !currentUser.value) {
		return;
	}

	status.value = "loading";

	try {
		await deleteDoc(doc(db, "users", currentUser.value.uid, "periods", selectedPeriod.value.id));
		closeDeletePeriodModal();
	} finally {
		status.value = "idle";
	}
}

async function handleCreateAsset(assetInput) {
	if (!currentUser.value) {
		return;
	}

	assetErrorMessage.value = "";
	status.value = "loading";

	try {
		await createAssetWithMonthlyState(currentUser.value.uid, assetInput, {
			year: selectedYear.value,
			month: selectedMonth.value,
		});
	} catch {
		assetErrorMessage.value = "Não foi possível salvar o ativo agora.";
	} finally {
		status.value = "idle";
	}
}

async function handleUpdateAsset(assetInput) {
	if (!currentUser.value || !assetInput?.id) {
		return;
	}

	assetErrorMessage.value = "";
	status.value = "loading";

	try {
		await updateAssetWithInitialMonthlyState(currentUser.value.uid, assetInput.id, assetInput);
	} catch {
		assetErrorMessage.value = "Não foi possível atualizar o ativo agora.";
	} finally {
		status.value = "idle";
	}
}

async function handleDeleteAsset(asset) {
	if (!currentUser.value || !asset?.id) {
		return;
	}

	const shouldDelete = window.confirm(
		`Excluir o ativo ${asset.name}? Os registros vinculados a ele também serão removidos.`,
	);
	if (!shouldDelete) {
		return;
	}

	assetErrorMessage.value = "";
	status.value = "loading";

	try {
		await deleteAssetCascade(currentUser.value.uid, asset.id);
	} catch {
		assetErrorMessage.value = "Não foi possível excluir o ativo agora.";
	} finally {
		status.value = "idle";
	}
}

watch(
	() => selectedYear.value,
	(year) => {
		if (!Number.isInteger(year)) {
			selectedMonth.value = null;
			return;
		}

		if (availableMonths.value.some((option) => option.value === selectedMonth.value)) {
			return;
		}

		selectedMonth.value = availableMonths.value[0]?.value ?? null;
	},
);

watch(
	() => [selectedYear.value, selectedMonth.value, currentUser.value?.uid],
	async ([year, month, uid]) => {
		if (!uid || !periodExists(year, month)) {
			return;
		}

		preferredPeriod.value = { year, month };
		await savePreferences({ selectedYear: year, selectedMonth: month });
	},
);

onMounted(() => {
	applyTheme();
	window.addEventListener("keydown", handleModalKeydown);
	window.addEventListener("app-update-available", handleAppUpdateAvailable);

	if (!auth) {
		authReady.value = true;
		currentPage.value = "settings";
		errorMessage.value = "Firebase não inicializado. Verifique a configuração do projeto.";
		return;
	}

	const applyAuthState = (user) => {
		currentUser.value = user;
		authReady.value = true;

		if (user) {
			errorMessage.value = "";
			currentPage.value = "home";
			listenPreferences(user.uid);
			listenPeriods(user.uid);
			listenAssets(user.uid);
			return;
		}

		clearUserState();
	};

	if (typeof auth.authStateReady === "function") {
		auth
			.authStateReady()
			.then(() => {
				applyAuthState(auth.currentUser);
			})
			.catch(() => {
				applyAuthState(auth.currentUser);
			});
	}

	unsubscribeAuth = onAuthStateChanged(auth, (user) => {
		applyAuthState(user);
	});
});

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleModalKeydown);
	window.removeEventListener("app-update-available", handleAppUpdateAvailable);
	unsubscribeAuth?.();
	unsubscribePreferences?.();
	unsubscribePeriods?.();
	unsubscribeAssets?.();
});
</script>

<template>
	<AppLayout>
		<div class="app-page">
			<section v-if="isUpdateAvailable" class="update-banner">
				<div class="update-banner-copy">
					<strong>Nova versão disponível.</strong>
					<span>Atualize o app para carregar a última versão instalada no PWA.</span>
				</div>
				<button class="primary-button" type="button" @click="reloadWithNewVersion">
					<span class="button-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none">
							<path d="M12 4.5v4.5m0 0 2.5-2.5M12 9l-2.5-2.5M5.85 8.85a7 7 0 1 0 1.16-1.4" />
						</svg>
					</span>
					Recarregar
				</button>
			</section>

			<h1 class="tittle">{{ appMeta.name }}</h1>

			<div v-if="!authReady" class="page-section status-card">
				<strong>Carregando autenticação...</strong>
			</div>

			<ConfiguracoesView
				v-else-if="!isAuthenticated"
				class="management-page-section"
				:theme="theme"
				:theme-color="currentColor"
				:user-email="currentUser?.email || ''"
				:is-authenticated="isAuthenticated"
				:is-submitting="isSubmitting"
				:auth-error="errorMessage"
				@update-theme="savePreferences({ darkMode: $event === 'dark' })"
				@update-theme-color="savePreferences({ themeColor: $event })"
				@login="handleGoogleSignIn"
				@logout="handleSignOut"
			/>

			<div v-else-if="!isDataReady" class="page-section status-card">
				<strong>Conectando dados online...</strong>
			</div>

			<HomeView
				v-else-if="currentPage === 'home'"
				:year-options="yearOptions"
				:month-options="availableMonths"
				:selected-year="selectedYear"
				:selected-month="selectedMonth"
				:period-label="periodLabel"
				:has-selected-period="Boolean(periodLabel)"
				:is-submitting="isSubmitting"
				@update:year="selectedYear = $event"
				@update:month="selectedMonth = $event"
				@add-month="openPeriodModal"
				@delete-month="openDeletePeriodModal"
			/>

			<ResumoView v-else-if="currentPage === 'summary'" />

			<AtivosView
				v-else-if="currentPage === 'assets'"
				:assets="assets"
				:selected-period-label="periodLabel"
				:has-selected-period="Boolean(selectedPeriodId)"
				:is-submitting="isSubmitting"
				:error-message="assetErrorMessage"
				@create-asset="handleCreateAsset"
				@update-asset="handleUpdateAsset"
				@delete-asset="handleDeleteAsset"
			/>

			<ConfiguracoesView
				v-else
				class="management-page-section"
				:theme="theme"
				:theme-color="currentColor"
				:user-email="currentUser?.email || ''"
				:is-authenticated="isAuthenticated"
				:is-submitting="isSubmitting"
				:auth-error="errorMessage"
				@update-theme="savePreferences({ darkMode: $event === 'dark' })"
				@update-theme-color="savePreferences({ themeColor: $event })"
				@login="handleGoogleSignIn"
				@logout="handleSignOut"
			/>

			<BottomTabs
				v-if="authReady && isAuthenticated && isDataReady"
				:tabs="navigationTabs"
				:current-tab="currentPage"
				@select="handleTabSelection"
			/>

			<div v-if="isPeriodModalOpen" class="modal-backdrop" @click="closePeriodModal">
				<div class="modal-card narrow-mobile-modal" @click.stop>
					<header class="modal-header">
						<h2>Adicionar mês</h2>
						<p>Escolha o ano e o mês que deseja abrir na carteira.</p>
					</header>

					<div class="modal-fields">
						<label class="field-group">
							<span class="field-label">Ano</span>
							<input v-model.number="periodModalYear" class="text-input" type="number" min="2000" step="1" />
						</label>

						<label class="field-group">
							<span class="field-label">Mês</span>
							<AppSelect v-model="periodModalMonth" :options="monthOptions" placeholder="Escolha o mês" />
						</label>
					</div>

					<div class="modal-actions">
						<button class="primary-button" type="button" :disabled="isSubmitting" @click="savePeriod">
							Salvar
						</button>
						<button class="danger-button" type="button" :disabled="isSubmitting" @click="closePeriodModal">
							Cancelar
						</button>
					</div>
				</div>
			</div>

			<div v-if="isDeletePeriodModalOpen" class="modal-backdrop" @click="closeDeletePeriodModal">
				<div class="modal-card narrow-mobile-modal" @click.stop>
					<header class="modal-header">
						<h2>Excluir mês</h2>
						<p>Confirme a exclusão do período atual.</p>
					</header>

					<div class="modal-fields">
						<div class="confirm-summary-card">
							<span class="field-label">Período selecionado</span>
							<strong>{{ selectedPeriod?.label || periodLabel }}</strong>
						</div>
					</div>

					<div class="modal-actions">
						<button class="secondary-button" type="button" :disabled="isSubmitting" @click="closeDeletePeriodModal">
							Cancelar
						</button>
						<button class="danger-button" type="button" :disabled="isSubmitting" @click="confirmDeleteSelectedPeriod">
							Excluir
						</button>
					</div>
				</div>
			</div>
		</div>
	</AppLayout>
</template>

<style scoped>
.app-page {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	justify-items: stretch;
	gap: 16px;
	width: 100%;
	min-width: 0;
	padding: 24px 24px 120px;
	max-width: 1180px;
	margin: 0 auto;
	text-align: left;
	box-sizing: border-box;
}

.page-section,
.status-card,
.modal-card {
	position: relative;
	z-index: 1;
	display: grid;
	width: 100%;
	min-width: 0;
	gap: 12px;
	padding: 18px;
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
	box-sizing: border-box;
}

.management-page-section {
	width: min(50vw, 560px);
	max-width: 100%;
	justify-self: center;
}

.tittle {
	text-align: center;
}

.status-card {
	justify-items: center;
}

.update-banner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 16px 18px;
	border: 1px solid color-mix(in srgb, var(--color-primary) 32%, var(--glass-border-strong));
	border-radius: 20px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--color-primary) 14%, var(--glass-surface-strong));
	box-shadow: var(--shadow);
	backdrop-filter: blur(18px);
}

.update-banner-copy {
	display: grid;
	gap: 4px;
}

.update-banner-copy strong {
	color: var(--text-h);
}

.update-banner-copy span {
	font-size: 14px;
	color: var(--text);
}

.primary-button,
.secondary-button,
.danger-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 11px 16px;
	position: relative;
	overflow: hidden;
	border: 1px solid var(--theme-button-border);
	border-radius: 18px;
	font: inherit;
	font-weight: 600;
	cursor: pointer;
	outline: none;
	appearance: none;
	-webkit-appearance: none;
	-webkit-tap-highlight-color: transparent;
	transition:
		transform 0.18s ease,
		background 0.18s ease,
		border-color 0.18s ease,
		color 0.18s ease,
		box-shadow 0.18s ease,
		opacity 0.18s ease;
}

.primary-button {
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: var(--text-soft);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.secondary-button {
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: var(--text-soft);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.primary-button:hover,
.secondary-button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

.primary-button:focus-visible,
.secondary-button:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 54%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.primary-button:active:not(:disabled),
.secondary-button:active:not(:disabled) {
	transform: translateY(0);
	border-color: color-mix(in srgb, var(--color-primary) 58%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.danger-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.danger-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
}

.danger-button:focus-visible,
.danger-button:active:not(:disabled) {
	border-color: var(--danger-border-strong);
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--danger-text) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.button-icon {
	width: 20px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.button-icon svg {
	width: 20px;
	height: 20px;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	z-index: 40;
	display: grid;
	place-items: center;
	padding: 24px;
	background: rgba(6, 10, 18, 0.52);
	backdrop-filter: blur(12px);
}

.modal-card {
	width: min(100%, 460px);
	gap: 18px;
	padding: 20px;
}

.modal-header {
	display: grid;
	gap: 6px;
}

.modal-header p {
	color: var(--text);
}

.modal-fields {
	display: grid;
	gap: 14px;
}

.confirm-summary-card {
	display: grid;
	gap: 6px;
	padding: 14px 16px;
	border: 1px solid color-mix(in srgb, var(--danger-border) 82%, var(--glass-border));
	border-radius: 16px;
	background: color-mix(in srgb, var(--danger-bg) 72%, var(--glass-surface-strong));
}

.confirm-summary-card strong {
	color: var(--text-h);
}

.field-group {
	display: grid;
	gap: 8px;
}

.field-label {
	font-size: 14px;
	font-weight: 600;
	color: var(--text-h);
}

.text-input {
	width: 100%;
	min-height: 46px;
	padding: 10px 14px;
	border: 1px solid var(--input-border);
	border-radius: 14px;
	background: var(--input-surface);
	color: var(--input-text);
	outline: none;
}

.text-input:focus-visible {
	border-color: var(--input-focus-border);
	box-shadow: 0 0 0 4px var(--input-focus-ring);
}

.modal-actions {
	display: flex;
	justify-content: flex-start;
	gap: 10px;
}

@media (min-width: 641px) and (max-width: 1023px) {
	.app-page {
		padding-inline: 18px;
	}

	.page-section,
	.status-card {
		padding: 16px;
	}

	.management-page-section {
		width: min(100%, 560px);
	}
}

@media (max-width: 640px) {
	.app-page {
		gap: 14px;
		padding: 14px 12px 118px;
	}

	.tittle {
		font-size: clamp(2rem, 10vw, 2.6rem);
		line-height: 1.02;
		margin-bottom: 6px;
	}

	.page-section,
	.status-card {
		padding: 16px;
		border-radius: 20px;
	}

	.management-page-section {
		width: 100%;
	}

	.update-banner {
		flex-direction: column;
		align-items: stretch;
	}

	.modal-backdrop {
		padding: 14px;
		align-items: end;
	}

	.modal-card.narrow-mobile-modal {
		width: 100%;
		border-radius: 22px;
	}

	.modal-actions {
		flex-direction: column;
	}
}
</style>
