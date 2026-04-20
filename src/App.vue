<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import BottomTabs from "./components/navigation/BottomTabs.vue";
import AppSelect from "./components/ui/AppSelect.vue";
import { appMeta } from "./config/appConfig";
import AppLayout from "./layout/AppLayout.vue";
import {
	createAssetWithMonthlyState,
	deleteAssetCascade,
	subscribeAssetMonthlyStates,
	subscribeAssets,
	subscribeTransactions,
	updateAssetWithInitialMonthlyState,
} from "./services/assets";
import { deleteHomeTransaction, saveHomeAssetAction, updateHomeTransaction } from "./services/homeActions";
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
const isInstallSupported = ref(false);
const canInstallApp = ref(false);
const isAppInstalled = ref(false);
const isInstallingApp = ref(false);
const hasInstalledApp = ref(false);
const currentPage = ref("home");
const userPreferences = ref({ darkMode: true, themeColor: "#4f7cff" });
const hasLoadedUiPreferences = ref(false);
const hasLoadedPeriods = ref(false);
const hasLoadedAssets = ref(false);
const hasLoadedMonthlyStates = ref(false);
const hasLoadedTransactions = ref(false);
const preferredPeriod = ref({ year: null, month: null });
const selectedYear = ref(null);
const selectedMonth = ref(null);
const periods = ref([]);
const assets = ref([]);
const assetMonthlyStates = ref([]);
const transactions = ref([]);
const isPeriodModalOpen = ref(false);
const isDeletePeriodModalOpen = ref(false);
const periodModalYear = ref(today.getFullYear());
const periodModalMonth = ref(today.getMonth() + 1);
const assetErrorMessage = ref("");
const homeActionErrorMessage = ref("");
const summaryActionErrorMessage = ref("");
const deletePeriodTarget = ref(null);
const deleteAssetTarget = ref(null);
const shouldShowPeriodValidation = ref(false);

let unsubscribeAuth = null;
let unsubscribePreferences = null;
let unsubscribePeriods = null;
let unsubscribeAssets = null;
let unsubscribeAssetMonthlyStates = null;
let unsubscribeTransactions = null;
let triggerAppUpdate = null;
let deferredInstallPrompt = null;
let isCreatingDefaultPeriod = false;
const INSTALLED_APP_STORAGE_KEY = "meus-investimentos-installed";

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
const isPeriodYearInvalid = computed(() =>
	shouldShowPeriodValidation.value && normalizeStoredYear(periodModalYear.value) == null,
);
const isPeriodMonthInvalid = computed(() =>
	shouldShowPeriodValidation.value && normalizeStoredMonth(periodModalMonth.value) == null,
);
const isPeriodFormInvalid = computed(() => isPeriodYearInvalid.value || isPeriodMonthInvalid.value);
const isDataReady = computed(() =>
	authReady.value &&
	(
		!isAuthenticated.value ||
		(
			hasLoadedUiPreferences.value
			&& hasLoadedPeriods.value
			&& hasLoadedAssets.value
			&& hasLoadedMonthlyStates.value
			&& hasLoadedTransactions.value
		)
	),
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

// Converte a cor principal em RGB para gerar tons derivados.
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

// Mistura duas cores para criar variações suaves do tema.
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

// Mantém a barra do navegador alinhada ao tema ativo.
function syncBrowserThemeColor(activeTheme) {
	const themeColorMeta = document.querySelector('meta[name="theme-color"]');
	if (!themeColorMeta) {
		return;
	}

	themeColorMeta.setAttribute("content", activeTheme === "dark" ? "#08111f" : "#f3f7ff");
}

// Centraliza o caminho do documento de preferências do usuário.
function userConfigDoc(uid) {
	return doc(db, "users", uid, "configs", "preferences");
}

// Valida valores persistidos antes de reaplicá-los na UI.
function normalizeStoredYear(value) {
	const normalized = Number(value);
	return Number.isInteger(normalized) && normalized >= 2000 ? normalized : null;
}

function normalizeStoredMonth(value) {
	const normalized = Number(value);
	return Number.isInteger(normalized) && normalized >= 1 && normalized <= 12 ? normalized : null;
}

// Aplica o tema e o acento no documento antes de atualizar a meta tag.
function applyTheme() {
	const activeTheme = theme.value;
	const accent = currentColor.value;

	document.documentElement.setAttribute("data-theme", activeTheme);
	document.documentElement.style.setProperty("--color-primary", accent);
	document.documentElement.style.setProperty("--color-primary-soft", mixHex(accent, { r: 255, g: 255, b: 255 }, 0.45));
	document.documentElement.style.setProperty("--theme-accent", accent);
	syncBrowserThemeColor(activeTheme);
}

// Gera um rótulo curto quando o período ainda não tem label salvo.
function buildMonthLabel(year, month) {
	const normalizedYear = Number(year);
	const normalizedMonth = Number(month);

	if (!Number.isInteger(normalizedYear) || !Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
		return String(year || "");
	}

	return `${String(normalizedMonth).padStart(2, "0")}/${normalizedYear}`;
}

// Evita criar ou selecionar períodos que ainda não existem.
function periodExists(year, month) {
	return periods.value.some((period) => period.year === year && period.month === month);
}

// Escolhe o período mais coerente entre preferência, seleção e dados disponíveis.
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

// Cria o período inicial só uma vez quando a base ainda está vazia.
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

// Persiste preferências locais e mantém o estado reativo sincronizado.
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

// Escuta preferências do usuário em tempo real.
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

// Escuta a coleção de períodos para manter filtros e seleção atualizados.
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

// Escuta os ativos do usuário sem depender de cache local.
function listenAssets(uid) {
	hasLoadedAssets.value = false;
	unsubscribeAssets?.();
	unsubscribeAssets = subscribeAssets(uid, (nextAssets) => {
		assets.value = nextAssets;
		hasLoadedAssets.value = true;
	});
}

// Escuta os snapshots mensais usados pela Home e pelo Resumo.
function listenAssetMonthlyStates(uid) {
	hasLoadedMonthlyStates.value = false;
	unsubscribeAssetMonthlyStates?.();
	unsubscribeAssetMonthlyStates = subscribeAssetMonthlyStates(uid, (nextMonthlyStates) => {
		assetMonthlyStates.value = nextMonthlyStates;
		hasLoadedMonthlyStates.value = true;
	});
}

// Escuta movimentações para refletir alterações imediatamente.
function listenTransactions(uid) {
	hasLoadedTransactions.value = false;
	unsubscribeTransactions?.();
	unsubscribeTransactions = subscribeTransactions(uid, (nextTransactions) => {
		transactions.value = nextTransactions;
		hasLoadedTransactions.value = true;
	});
}

// Inicia a autenticação com Google e expõe erro legível se falhar.
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

// Encerra a sessão atual e limpa o estado controlado.
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

// Guarda o callback do update para disparar a atualização depois.
function handleAppUpdateAvailable(event) {
	triggerAppUpdate = typeof event.detail?.update === "function" ? event.detail.update : null;
	isUpdateAvailable.value = true;
}

// Recarrega o app usando a nova versão do service worker.
function reloadWithNewVersion() {
	if (!triggerAppUpdate) {
		window.location.reload();
		return;
	}

	triggerAppUpdate();
}

// Detecta se o app já está rodando fora do navegador.
function isRunningAsInstalledApp() {
	return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

// Lê o marcador de instalação salvo em sessão anterior.
function readInstalledAppFlag() {
	try {
		return window.localStorage.getItem(INSTALLED_APP_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

// Atualiza o marcador local que ajuda a esconder o prompt.
function writeInstalledAppFlag(value) {
	try {
		if (value) {
			window.localStorage.setItem(INSTALLED_APP_STORAGE_KEY, "true");
			return;
		}

		window.localStorage.removeItem(INSTALLED_APP_STORAGE_KEY);
	} catch {
		// Ignore storage errors for install UI state.
	}
}

// Sincroniza os estados derivados do fluxo de instalação.
function syncInstallAvailability() {
	isAppInstalled.value = hasInstalledApp.value || isRunningAsInstalledApp();
	canInstallApp.value = Boolean(deferredInstallPrompt) && !isAppInstalled.value;
}

// Captura o prompt nativo de instalação para exibi-lo sob demanda.
function handleBeforeInstallPrompt(event) {
	if (isRunningAsInstalledApp()) {
		return;
	}

	deferredInstallPrompt = event;
	syncInstallAvailability();
}

// Marca a instalação como concluída e limpa o prompt pendente.
function handleAppInstalled() {
	hasInstalledApp.value = true;
	writeInstalledAppFlag(true);
	deferredInstallPrompt = null;
	isInstallingApp.value = false;
	syncInstallAvailability();
}

// Dispara o prompt nativo de instalação quando ele estiver disponível.
async function handleInstallApp() {
	if (!deferredInstallPrompt || isInstallingApp.value) {
		return;
	}

	isInstallingApp.value = true;

	try {
		await deferredInstallPrompt.prompt();
		const choice = await deferredInstallPrompt.userChoice;
		if (choice?.outcome !== "accepted") {
			isInstallingApp.value = false;
		}

		deferredInstallPrompt = null;
		syncInstallAvailability();
	} catch (error) {
		console.error("Falha ao exibir o prompt de instalação", error);
		isInstallingApp.value = false;
	}
}

// Reseta toda a sessão para um estado limpo ao deslogar.
function clearUserState() {
	unsubscribePreferences?.();
	unsubscribePeriods?.();
	unsubscribeAssets?.();
	unsubscribeAssetMonthlyStates?.();
	unsubscribeTransactions?.();
	periods.value = [];
	assets.value = [];
	assetMonthlyStates.value = [];
	transactions.value = [];
	hasLoadedUiPreferences.value = false;
	hasLoadedPeriods.value = false;
	hasLoadedAssets.value = false;
	hasLoadedMonthlyStates.value = false;
	hasLoadedTransactions.value = false;
	preferredPeriod.value = { year: null, month: null };
	userPreferences.value = { darkMode: true, themeColor: "#4f7cff" };
	selectedYear.value = defaultPeriod.year;
	selectedMonth.value = defaultPeriod.month;
	currentPage.value = "settings";
	isPeriodModalOpen.value = false;
	isDeletePeriodModalOpen.value = false;
	deletePeriodTarget.value = null;
	deleteAssetTarget.value = null;
	shouldShowPeriodValidation.value = false;
	assetErrorMessage.value = "";
	homeActionErrorMessage.value = "";
	summaryActionErrorMessage.value = "";
	applyTheme();
}

// Bloqueia a navegação principal para usuários não autenticados.
function handleTabSelection(nextPage) {
	if (!isAuthenticated.value && nextPage !== "settings") {
		currentPage.value = "settings";
		return;
	}

	currentPage.value = nextPage;
}

// Abre o modal já preenchendo o período atualmente selecionado.
function openPeriodModal() {
	periodModalYear.value = selectedYear.value || today.getFullYear();
	periodModalMonth.value = selectedMonth.value || today.getMonth() + 1;
	isPeriodModalOpen.value = true;
	shouldShowPeriodValidation.value = false;
	void nextTick(() => {
		shouldShowPeriodValidation.value = true;
	});
}

function closePeriodModal() {
	isPeriodModalOpen.value = false;
	shouldShowPeriodValidation.value = false;
}

// Pré-carrega o período alvo antes de confirmar a exclusão.
function openDeletePeriodModal() {
	if (!selectedPeriod.value || !currentUser.value) {
		return;
	}

	deletePeriodTarget.value = {
		id: selectedPeriod.value.id,
		label: selectedPeriod.value.label || periodLabel.value,
	};
	isDeletePeriodModalOpen.value = true;
}

function closeDeletePeriodModal() {
	if (status.value === "loading") {
		return;
	}

	isDeletePeriodModalOpen.value = false;
	deletePeriodTarget.value = null;
}

// Seleciona o ativo alvo antes da confirmação de exclusão.
function openDeleteAssetModal(asset) {
	if (!currentUser.value || !asset?.id) {
		return;
	}

	deleteAssetTarget.value = {
		id: asset.id,
		name: String(asset.name || "este ativo"),
	};
}

function closeDeleteAssetModal() {
	if (status.value === "loading") {
		return;
	}

	deleteAssetTarget.value = null;
}

// Descobre qual modal está ativo para tratar Escape e Enter.
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

	if (deleteAssetTarget.value) {
		return {
			confirm: confirmDeleteAsset,
			cancel: closeDeleteAssetModal,
		};
	}

	return null;
}

// Evita interceptar atalhos quando o foco está em um campo editável.
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

// Direciona Enter e Escape para o modal ativo sem quebrar inputs.
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

// Cria o período se necessário e troca a seleção para ele.
async function savePeriod() {
	if (!currentUser.value || isPeriodFormInvalid.value) {
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

// Remove o período selecionado e seus dados dependentes.
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

// Confirma a exclusão e fecha o modal só após sucesso.
async function confirmDeleteSelectedPeriod() {
	if (!deletePeriodTarget.value || !currentUser.value) {
		return;
	}

	let didDelete = false;
	status.value = "loading";

	try {
		await deleteDoc(doc(db, "users", currentUser.value.uid, "periods", deletePeriodTarget.value.id));
		didDelete = true;
	} finally {
		status.value = "idle";
	}

	if (didDelete) {
		closeDeletePeriodModal();
	}
}

// Cria um ativo já com o snapshot mensal inicial do período ativo.
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

// Envia a ação da Home com o contexto do ativo e do período.
async function handleHomeAssetAction(actionInput) {
	if (!currentUser.value || !selectedPeriodId.value) {
		return;
	}

	const asset = assets.value.find((entry) => entry.id === actionInput?.assetId) || null;
	if (!asset) {
		homeActionErrorMessage.value = "Não foi possível localizar o ativo selecionado.";
		return;
	}

	const assetStates = assetMonthlyStates.value
		.filter((monthlyState) => monthlyState.assetId === asset.id)
		.sort((leftState, rightState) => leftState.periodId.localeCompare(rightState.periodId, "pt-BR"));
	const currentMonthlyState = assetStates.find((monthlyState) => monthlyState.periodId === selectedPeriodId.value) || null;
	const referenceMonthlyState = currentMonthlyState
		|| [...assetStates]
			.reverse()
			.find((monthlyState) => monthlyState.periodId < selectedPeriodId.value)
		|| null;

	homeActionErrorMessage.value = "";
	status.value = "loading";

	try {
		await saveHomeAssetAction(
			currentUser.value.uid,
			{
				...actionInput,
				periodId: selectedPeriodId.value,
			},
			{
				asset,
				currentMonthlyState,
				referenceMonthlyState,
			},
		);
	} catch {
		homeActionErrorMessage.value = "Não foi possível salvar esta ação agora.";
	} finally {
		status.value = "idle";
	}
}

// Atualiza o cadastro do ativo e o estado inicial relacionado.
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

// Regrava a transação editada e recalcula o resumo correspondente.
async function handleUpdateTransaction(transactionInput) {
	if (!currentUser.value || !transactionInput?.id) {
		return;
	}

	summaryActionErrorMessage.value = "";
	status.value = "loading";

	try {
		await updateHomeTransaction(currentUser.value.uid, transactionInput);
	} catch {
		summaryActionErrorMessage.value = "Não foi possível atualizar esta movimentação agora.";
	} finally {
		status.value = "idle";
	}
}

// Exclui a movimentação e dispara a recomposição do mês.
async function handleDeleteTransaction(transactionId) {
	if (!currentUser.value || !transactionId) {
		return;
	}

	summaryActionErrorMessage.value = "";
	status.value = "loading";

	try {
		await deleteHomeTransaction(currentUser.value.uid, transactionId);
	} catch {
		summaryActionErrorMessage.value = "Não foi possível excluir esta movimentação agora.";
	} finally {
		status.value = "idle";
	}
}

// Remove o ativo em cascata e fecha o modal só quando concluir.
async function confirmDeleteAsset() {
	if (!currentUser.value || !deleteAssetTarget.value?.id) {
		return;
	}

	assetErrorMessage.value = "";
	status.value = "loading";
	let didDelete = false;

	try {
		await deleteAssetCascade(currentUser.value.uid, deleteAssetTarget.value.id);
		didDelete = true;
	} catch {
		assetErrorMessage.value = "Não foi possível excluir o ativo agora.";
	} finally {
		status.value = "idle";
	}

	if (didDelete) {
		closeDeleteAssetModal();
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
	hasInstalledApp.value = readInstalledAppFlag();
	isInstallSupported.value = "BeforeInstallPromptEvent" in window || /iphone|ipad|ipod/i.test(window.navigator.userAgent);
	syncInstallAvailability();
	window.addEventListener("keydown", handleModalKeydown);
	window.addEventListener("app-update-available", handleAppUpdateAvailable);
	window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
	window.addEventListener("appinstalled", handleAppInstalled);

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
			listenAssetMonthlyStates(user.uid);
			listenTransactions(user.uid);
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
	window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
	window.removeEventListener("appinstalled", handleAppInstalled);
	unsubscribeAuth?.();
	unsubscribePreferences?.();
	unsubscribePeriods?.();
	unsubscribeAssets?.();
	unsubscribeAssetMonthlyStates?.();
	unsubscribeTransactions?.();
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
				:can-install-app="canInstallApp"
				:is-app-installed="isAppInstalled"
				:is-install-supported="isInstallSupported"
				:is-installing-app="isInstallingApp"
				@update-theme="savePreferences({ darkMode: $event === 'dark' })"
				@update-theme-color="savePreferences({ themeColor: $event })"
				@login="handleGoogleSignIn"
				@logout="handleSignOut"
				@install-app="handleInstallApp"
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
				:error-message="homeActionErrorMessage"
				:assets="assets"
				:monthly-states="assetMonthlyStates"
				:selected-period-id="selectedPeriodId"
				@update:year="selectedYear = $event"
				@update:month="selectedMonth = $event"
				@add-month="openPeriodModal"
				@delete-month="openDeletePeriodModal"
				@submit-action="handleHomeAssetAction"
			/>

			<ResumoView
				v-else-if="currentPage === 'summary'"
				:assets="assets"
				:monthly-states="assetMonthlyStates"
				:transactions="transactions"
				:period-label="periodLabel"
				:is-submitting="isSubmitting"
				:error-message="summaryActionErrorMessage"
				:selected-year="selectedYear"
				:selected-period-id="selectedPeriodId"
				@update-transaction="handleUpdateTransaction"
				@delete-transaction="handleDeleteTransaction"
			/>

			<AtivosView
				v-else-if="currentPage === 'assets'"
				:assets="assets"
				:selected-period-label="periodLabel"
				:has-selected-period="Boolean(selectedPeriodId)"
				:is-submitting="isSubmitting"
				:error-message="assetErrorMessage"
				@create-asset="handleCreateAsset"
				@update-asset="handleUpdateAsset"
				@delete-asset="openDeleteAssetModal"
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
				:can-install-app="canInstallApp"
				:is-app-installed="isAppInstalled"
				:is-install-supported="isInstallSupported"
				:is-installing-app="isInstallingApp"
				@update-theme="savePreferences({ darkMode: $event === 'dark' })"
				@update-theme-color="savePreferences({ themeColor: $event })"
				@login="handleGoogleSignIn"
				@logout="handleSignOut"
				@install-app="handleInstallApp"
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
							<input
								v-model.number="periodModalYear"
								:class="['text-input', { 'required-empty': isPeriodYearInvalid }]"
								type="number"
								min="2000"
								step="1"
							/>
							<span v-if="isPeriodYearInvalid" class="error-text">Informe um ano v&aacute;lido.</span>
						</label>

						<label class="field-group">
							<span class="field-label">Mês</span>
							<AppSelect
								v-model="periodModalMonth"
								:options="monthOptions"
								:invalid="isPeriodMonthInvalid"
								placeholder="Escolha o mês"
							/>
							<span v-if="isPeriodMonthInvalid" class="error-text">Escolha um m&ecirc;s.</span>
						</label>
					</div>

					<div class="modal-actions">
						<button class="primary-button" type="button" :disabled="isSubmitting || isPeriodFormInvalid" @click="savePeriod">
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
							<strong>{{ deletePeriodTarget?.label || selectedPeriod?.label || periodLabel }}</strong>
						</div>
					</div>

					<div class="modal-actions">
						<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeDeletePeriodModal">
							Cancelar
						</button>
						<button class="danger-button" type="button" :disabled="isSubmitting" @click="confirmDeleteSelectedPeriod">
							Excluir
						</button>
					</div>
				</div>
			</div>

			<div v-if="deleteAssetTarget" class="modal-backdrop" @click="closeDeleteAssetModal">
				<div class="modal-card narrow-mobile-modal" @click.stop>
					<header class="modal-header">
						<h2>Excluir ativo</h2>
						<p>Confirme a exclusão do ativo selecionado.</p>
					</header>

					<div class="modal-fields">
						<div class="confirm-summary-card">
							<span class="field-label">Ativo selecionado</span>
							<strong>{{ deleteAssetTarget.name }}</strong>
							<span class="field-note">Os registros vinculados a este ativo também serão removidos.</span>
						</div>
					</div>

					<div class="modal-actions">
						<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeDeleteAssetModal">
							Cancelar
						</button>
						<button class="danger-button" type="button" :disabled="isSubmitting" @click="confirmDeleteAsset">
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

.required-empty {
	border-color: var(--validation-error-border) !important;
	box-shadow: 0 0 0 2px var(--validation-error-ring);
	background: var(--validation-error-bg);
}

.field-group:has(.required-empty) .field-label,
.field-group:has(.app-select.is-invalid) .field-label {
	color: var(--validation-error-text);
}

.error-text {
	font-size: 13px;
	color: var(--validation-error-text);
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
