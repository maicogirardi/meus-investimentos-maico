<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
	assets: {
		type: Array,
		default: () => [],
	},
	selectedPeriodLabel: {
		type: String,
		default: "",
	},
	hasSelectedPeriod: {
		type: Boolean,
		default: false,
	},
	isSubmitting: {
		type: Boolean,
		default: false,
	},
	errorMessage: {
		type: String,
		default: "",
	},
});

const emit = defineEmits(["create-asset", "delete-asset"]);

const isCreateModalOpen = ref(false);
const isCreatePending = ref(false);
const assetForm = reactive({
	name: "",
	institution: "",
	category: "",
	startDate: "",
	initialValue: "",
});

const summary = computed(() => ({
	count: props.assets.length,
	totalInitialValue: props.assets.reduce((total, asset) => total + Number(asset.initialValue || 0), 0),
}));

watch(
	() => props.assets.length,
	(nextCount, previousCount) => {
		if (!isCreatePending.value || nextCount <= previousCount) {
			return;
		}

		isCreatePending.value = false;
		isCreateModalOpen.value = false;
		resetForm();
	},
);

watch(
	() => props.errorMessage,
	(value) => {
		if (value) {
			isCreatePending.value = false;
		}
	},
);

function formatCurrency(value) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number(value || 0));
}

function formatDate(value) {
	if (!value) {
		return "Data não informada";
	}

	const [year, month, day] = String(value).split("-");
	if (!year || !month || !day) {
		return value;
	}

	return new Intl.DateTimeFormat("pt-BR").format(new Date(Number(year), Number(month) - 1, Number(day)));
}

function resetForm() {
	assetForm.name = "";
	assetForm.institution = "";
	assetForm.category = "";
	assetForm.startDate = "";
	assetForm.initialValue = "";
}

function openCreateModal() {
	resetForm();
	isCreateModalOpen.value = true;
}

function closeCreateModal() {
	if (props.isSubmitting) {
		return;
	}

	isCreatePending.value = false;
	isCreateModalOpen.value = false;
}

function submitAsset() {
	const initialValue = Number(assetForm.initialValue);
	if (!assetForm.name.trim() || !assetForm.startDate || !Number.isFinite(initialValue) || initialValue <= 0) {
		return;
	}

	emit("create-asset", {
		name: assetForm.name,
		institution: assetForm.institution,
		category: assetForm.category,
		startDate: assetForm.startDate,
		initialValue,
	});
	isCreatePending.value = true;
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
	if (!isCreateModalOpen.value || props.isSubmitting) {
		return;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		closeCreateModal();
		return;
	}

	if (event.key !== "Enter" || event.shiftKey || isKeyboardShortcutTargetBlocked()) {
		return;
	}

	event.preventDefault();
	submitAsset();
}

onMounted(() => {
	window.addEventListener("keydown", handleModalKeydown);
});

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleModalKeydown);
});
</script>

<template>
	<section class="assets-view">
		<section class="hero-card">
			<div class="hero-copy">
				<p class="eyebrow">Cadastro mestre</p>
				<h2>Adicionar ativos</h2>
				<p class="hero-text">
					Cadastre cada ativo uma vez e o app já abre o estado mensal inicial no período selecionado.
				</p>
			</div>

			<div class="hero-side">
				<div class="period-badge" :class="{ muted: !hasSelectedPeriod }">
					<span>Período ativo</span>
					<strong>{{ hasSelectedPeriod ? selectedPeriodLabel : "Selecione um mês na Home" }}</strong>
				</div>

				<button class="primary-button" type="button" :disabled="isSubmitting || !hasSelectedPeriod" @click="openCreateModal">
					<span class="button-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</span>
					Adicionar ativo
				</button>
			</div>
		</section>

		<section class="summary-grid">
			<article class="summary-card">
				<span class="summary-label">Ativos cadastrados</span>
				<strong>{{ summary.count }}</strong>
				<p>Base principal da carteira pronta para leituras, aportes e saques.</p>
			</article>

			<article class="summary-card">
				<span class="summary-label">Capital inicial somado</span>
				<strong>{{ formatCurrency(summary.totalInitialValue) }}</strong>
				<p>Valor de partida usado para abrir cada estado mensal inicial.</p>
			</article>
		</section>

		<p v-if="errorMessage" class="feedback-error">{{ errorMessage }}</p>

		<section v-if="assets.length > 0" class="asset-list">
			<article v-for="asset in assets" :key="asset.id" class="asset-card">
				<div class="asset-main">
					<div class="asset-header">
						<div class="asset-title-block">
							<h3>{{ asset.name }}</h3>
							<p>{{ formatCurrency(asset.initialValue) }}</p>
						</div>

						<button class="danger-button icon-button" type="button" :disabled="isSubmitting" @click="$emit('delete-asset', asset)">
							<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path d="M6 7h12M9.5 7V5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V7m-7 0 .5 11a1 1 0 0 0 1 .95h6a1 1 0 0 0 1-.95L16.5 7" />
							</svg>
						</button>
					</div>

					<div class="asset-tags">
						<span v-if="asset.category" class="tag">{{ asset.category }}</span>
						<span v-if="asset.institution" class="tag">{{ asset.institution }}</span>
						<span class="tag subtle">Início: {{ formatDate(asset.startDate) }}</span>
					</div>
				</div>
			</article>
		</section>

		<section v-else class="empty-card">
			<p class="eyebrow">Primeiro passo</p>
			<h2>Nenhum ativo cadastrado ainda.</h2>
			<p>
				Comece registrando o primeiro ativo da carteira. O app cria automaticamente o estado inicial no mês ativo.
			</p>
		</section>

		<div v-if="isCreateModalOpen" class="modal-backdrop" @click="closeCreateModal">
			<div class="modal-card" @click.stop>
				<header class="modal-header">
					<h2>Novo ativo</h2>
					<p>Os campos obrigatórios são nome, data inicial e valor inicial.</p>
				</header>

				<div class="modal-grid">
					<label class="field-group field-group-full">
						<span class="field-label">Nome do ativo</span>
						<input v-model.trim="assetForm.name" class="text-input" type="text" maxlength="80" placeholder="Ex.: CDB Itaú 100% CDI" />
					</label>

					<label class="field-group">
						<span class="field-label">Instituição</span>
						<input v-model.trim="assetForm.institution" class="text-input" type="text" maxlength="50" placeholder="Ex.: Itaú" />
					</label>

					<label class="field-group">
						<span class="field-label">Categoria</span>
						<input v-model.trim="assetForm.category" class="text-input" type="text" maxlength="40" placeholder="Ex.: CDB" />
					</label>

					<label class="field-group">
						<span class="field-label">Data inicial</span>
						<input v-model="assetForm.startDate" class="text-input" type="date" />
					</label>

					<label class="field-group">
						<span class="field-label">Valor inicial</span>
						<input
							v-model.number="assetForm.initialValue"
							class="text-input"
							type="number"
							min="0.01"
							step="0.01"
							inputmode="decimal"
							placeholder="0,00"
						/>
					</label>
				</div>

				<p class="modal-note">
					O estado mensal inicial será criado em <strong>{{ selectedPeriodLabel || "um período ativo" }}</strong>.
				</p>

				<div class="modal-actions">
					<button class="primary-button" type="button" :disabled="isSubmitting" @click="submitAsset">
						Salvar ativo
					</button>
					<button class="danger-button" type="button" :disabled="isSubmitting" @click="closeCreateModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.assets-view {
	display: grid;
	gap: 18px;
	width: 100%;
}

.hero-card,
.summary-card,
.asset-card,
.empty-card,
.modal-card {
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.hero-card {
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
	gap: 18px;
	padding: 22px;
	background:
		radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 20%, transparent) 0%, transparent 48%),
		linear-gradient(180deg, color-mix(in srgb, var(--glass-surface-strong) 96%, transparent) 0%, var(--glass-surface) 100%);
}

.hero-copy {
	display: grid;
	gap: 8px;
}

.hero-text {
	max-width: 56ch;
	color: var(--text);
}

.hero-side {
	display: grid;
	gap: 12px;
	align-content: start;
	justify-items: stretch;
}

.period-badge {
	display: grid;
	gap: 4px;
	padding: 14px 16px;
	border: 1px solid color-mix(in srgb, var(--color-primary) 28%, var(--glass-border-strong));
	border-radius: 18px;
	background: color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface-strong));
}

.period-badge span,
.summary-label,
.eyebrow {
	font-size: 0.8rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.period-badge strong {
	color: var(--text-h);
}

.period-badge.muted {
	border-color: var(--glass-border);
	background: var(--glass-surface-strong);
}

.summary-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
}

.summary-card {
	display: grid;
	gap: 8px;
	padding: 18px;
}

.summary-card strong {
	font-size: clamp(1.6rem, 3.4vw, 2.5rem);
	line-height: 1;
	letter-spacing: -0.05em;
	color: var(--text-h);
}

.summary-card p {
	color: var(--text);
}

.feedback-error {
	margin: 0;
	padding: 12px 14px;
	border: 1px solid var(--danger-border);
	border-radius: 16px;
	background: var(--danger-bg);
	color: var(--danger-text);
}

.asset-list {
	display: grid;
	gap: 14px;
}

.asset-card {
	display: grid;
	padding: 18px;
}

.asset-main {
	display: grid;
	gap: 12px;
}

.asset-header {
	display: flex;
	align-items: start;
	justify-content: space-between;
	gap: 12px;
}

.asset-title-block {
	display: grid;
	gap: 6px;
}

.asset-title-block h3 {
	margin: 0;
	font-size: 1.15rem;
	color: var(--text-h);
}

.asset-title-block p {
	color: var(--text);
}

.asset-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.tag {
	display: inline-flex;
	align-items: center;
	padding: 8px 12px;
	border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--glass-border));
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface-strong));
	color: var(--text-h);
	font-size: 0.9rem;
}

.tag.subtle {
	border-color: var(--glass-border);
	background: var(--glass-surface-strong);
	color: var(--text);
}

.empty-card {
	display: grid;
	gap: 10px;
	padding: 24px;
	text-align: center;
	justify-items: center;
}

.empty-card p:last-child {
	max-width: 48ch;
	color: var(--text);
}

.primary-button,
.secondary-button,
.danger-button,
.icon-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	border: 1px solid var(--theme-button-border);
	border-radius: 18px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: var(--text-soft);
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
		box-shadow 0.18s ease,
		opacity 0.18s ease;
}

.primary-button,
.secondary-button,
.danger-button {
	padding: 11px 16px;
	font: inherit;
	font-weight: 600;
}

.icon-button {
	width: 42px;
	height: 42px;
	padding: 0;
	border-radius: 50%;
	flex: 0 0 42px;
}

.primary-button:hover,
.secondary-button:hover,
.icon-button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

.primary-button:focus-visible,
.secondary-button:focus-visible,
.icon-button:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 54%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.primary-button:disabled,
.secondary-button:disabled,
.danger-button:disabled,
.icon-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.danger-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.danger-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	color: var(--danger-text);
}

.button-icon,
.icon-button svg {
	width: 20px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.button-icon svg,
.icon-button svg {
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
	display: grid;
	gap: 18px;
	width: min(100%, 640px);
	padding: 22px;
}

.modal-header {
	display: grid;
	gap: 6px;
}

.modal-header p,
.modal-note {
	color: var(--text);
}

.modal-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.field-group {
	display: grid;
	gap: 8px;
}

.field-group-full {
	grid-column: 1 / -1;
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

@media (max-width: 860px) {
	.hero-card {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 640px) {
	.assets-view {
		gap: 14px;
	}

	.hero-card,
	.summary-card,
	.asset-card,
	.empty-card {
		padding: 16px;
		border-radius: 20px;
	}

	.summary-grid,
	.modal-grid {
		grid-template-columns: 1fr;
	}

	.modal-backdrop {
		padding: 14px;
		align-items: end;
	}

	.modal-card {
		width: 100%;
		padding: 18px;
		border-radius: 22px;
	}

	.modal-actions {
		flex-direction: column;
	}
}
</style>
