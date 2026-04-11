<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AppSelect from "../components/ui/AppSelect.vue";

const props = defineProps({
	yearOptions: {
		type: Array,
		default: () => [],
	},
	monthOptions: {
		type: Array,
		default: () => [],
	},
	selectedYear: {
		type: Number,
		default: null,
	},
	selectedMonth: {
		type: Number,
		default: null,
	},
	periodLabel: {
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
	assets: {
		type: Array,
		default: () => [],
	},
});

defineEmits(["update:year", "update:month", "add-month", "delete-month"]);

const activeAssets = computed(() => props.assets.filter((asset) => asset.isActive !== false));
const totalInitialValue = computed(() =>
	activeAssets.value.reduce((total, asset) => total + Number(asset.initialValue || 0), 0),
);
const isWalletCardCompact = ref(false);

function formatCurrency(value) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number(value || 0));
}

function formatDate(value) {
	if (!value) {
		return "Data não informada";
	}

	const [year, month, day] = String(value).split("-");
	if (!year || !month || !day) {
		return String(value);
	}

	return new Intl.DateTimeFormat("pt-BR").format(new Date(Number(year), Number(month) - 1, Number(day)));
}

function handleWindowScroll() {
	isWalletCardCompact.value = window.scrollY > 120;
}

onMounted(() => {
	handleWindowScroll();
	window.addEventListener("scroll", handleWindowScroll, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener("scroll", handleWindowScroll);
});
</script>

<template>
	<section class="home-view">
		<section class="filter-card">
			<div class="filter-row">
				<div class="filter-selects">
					<AppSelect
						class="year-filter"
						:model-value="selectedYear"
						:options="yearOptions"
						placeholder="Ano"
						@update:model-value="$emit('update:year', $event)"
					/>

					<AppSelect
						class="month-filter"
						:model-value="selectedMonth"
						:options="monthOptions"
						placeholder="Mês"
						@update:model-value="$emit('update:month', $event)"
					/>
				</div>

				<div class="filter-spacer" />

				<div class="filter-actions">
					<button :disabled="isSubmitting" type="button" @click="$emit('add-month')">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
							<path fill-rule="evenodd" d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v6.41A7.5 7.5 0 1 0 10.5 22H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Z" clip-rule="evenodd" />
							<path fill-rule="evenodd" d="M9 16a6 6 0 1 1 12 0 6 6 0 0 1-12 0Zm6-3a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z" clip-rule="evenodd" />
						</svg>
					</button>

					<button class="danger-button month-remove-button" :disabled="isSubmitting || !hasSelectedPeriod" type="button" @click="$emit('delete-month')">
						<svg class="delete-icon-svg" width="26" height="26" viewBox="124 86 10 16" aria-hidden="true">
							<path
								d="M 126.81 89.11 L 126.81 87.61 C 126.81 87.058 127.258 86.61 127.81 86.61 L 130.81 86.61 C 131.362 86.61 131.81 87.058 131.81 87.61 L 131.81 89.11 L 124.81 89.11 L 124.918 89.901 L 133.702 89.901 L 133.81 89.11 Z M 132.31 99.11 C 132.283 99.643 131.843 100.061 131.31 100.06 L 127.31 100.06 C 126.777 100.061 126.337 99.643 126.31 99.11 L 125.036 90.767 L 133.584 90.767 Z M 130.627 98.807 L 131.493 98.807 L 131.493 91.978 L 130.627 91.978 Z M 128.902 98.807 L 129.768 98.807 L 129.768 91.978 L 128.902 91.978 Z M 127.204 98.807 L 128.07 98.807 L 128.07 91.978 L 127.204 91.978 Z"
								fill="currentColor"
								style="stroke-width: 1;"
							/>
						</svg>
					</button>
				</div>
			</div>
		</section>

		<section v-if="hasSelectedPeriod" class="wallet-card" :class="{ 'wallet-card-compact': isWalletCardCompact }">
			<div class="wallet-card-main">
				<p class="wallet-label">Saldo total</p>
				<strong class="wallet-total">{{ formatCurrency(totalInitialValue) }}</strong>
			</div>

			<ul v-if="activeAssets.length > 0" class="wallet-asset-list">
				<li v-for="asset in activeAssets" :key="`wallet-${asset.id}`" class="wallet-asset-row">
					<div class="wallet-asset-info">
						<span class="wallet-asset-dot" :style="{ '--asset-color': asset.color || '#4F7CFF' }" />
						<span class="wallet-asset-name">{{ asset.name }}</span>
					</div>
					<strong class="wallet-asset-value">{{ formatCurrency(asset.initialValue) }}</strong>
				</li>
			</ul>

			<div v-else class="wallet-empty-state">
				<span>Nenhum ativo cadastrado neste período.</span>
			</div>
		</section>

		<section v-if="hasSelectedPeriod && activeAssets.length > 0" class="asset-panel">
			<section class="asset-list">
				<article
					v-for="asset in activeAssets"
					:key="asset.id"
					class="asset-card"
					:style="{ '--asset-color': asset.color || '#4F7CFF' }"
				>
					<div class="asset-title-band">
						<div class="asset-title-row asset-title-row-surface">
							<span class="asset-color-dot" :style="{ '--asset-color': asset.color || '#4F7CFF' }" />
							<h3>{{ asset.name }}</h3>
						</div>
					</div>

					<div class="asset-card-top">
						<div class="asset-identity">
							<div class="asset-info-table">
								<div class="asset-info-row">
									<span class="asset-info-label">Categoria</span>
									<strong class="asset-info-value">{{ asset.category || "--" }}</strong>
								</div>

								<div class="asset-info-row">
									<span class="asset-info-label">Instituição</span>
									<strong class="asset-info-value">{{ asset.institution || "--" }}</strong>
								</div>

								<div class="asset-info-row">
									<span class="asset-info-label">Entrada</span>
									<strong class="asset-info-value">{{ formatDate(asset.startDate) }}</strong>
								</div>
							</div>
						</div>

						<div class="entry-value-card">
							<span>Valor de entrada</span>
							<strong>{{ formatCurrency(asset.initialValue) }}</strong>
						</div>
					</div>

					<div class="home-metrics-grid">
						<article class="metric-card">
							<span>Total</span>
							<strong>{{ formatCurrency(asset.initialValue) }}</strong>
						</article>

						<article class="metric-card">
							<span>Rendimento</span>
							<strong>--</strong>
						</article>

						<article class="metric-card">
							<span>Saldo atual no banco</span>
							<strong>--</strong>
						</article>

						<article class="metric-card">
							<span>Rendimento diário</span>
							<strong>--</strong>
						</article>
					</div>

					<div class="asset-actions">
						<button type="button" class="action-button action-button-primary" disabled>
							Atualizar leitura
						</button>
						<button type="button" class="action-button" disabled>Aporte</button>
						<button type="button" class="action-button" disabled>Saque</button>
						<button type="button" class="action-button action-button-danger" disabled>
							Saque extra
						</button>
					</div>
				</article>
			</section>
		</section>

		<section v-else-if="hasSelectedPeriod" class="empty-card">
			<h3>Nenhum ativo cadastrado.</h3>
			<p>Cadastre ativos na aba Ativos para começar a montar os cards da Home.</p>
		</section>

		<section v-else class="empty-card">
			<p class="eyebrow">Período</p>
			<h3>Nenhum mês criado.</h3>
			<p>Use o botão de adicionar para escolher o primeiro mês da carteira.</p>
		</section>
	</section>
</template>

<style scoped>
.home-view {
	display: grid;
	gap: 22px;
	width: 100%;
}

.filter-card,
.wallet-card,
.asset-card,
.entry-value-card,
.metric-card,
.empty-card {
	border: 1px solid var(--glass-border);
	border-radius: 22px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.filter-card {
	position: relative;
	z-index: 12;
	overflow: visible;
	display: grid;
	padding: 16px;
}

.filter-row {
	position: relative;
	z-index: 2;
	display: flex;
	gap: 12px;
	align-items: center;
	flex-wrap: nowrap;
	width: 100%;
}

.filter-selects {
	position: relative;
	z-index: 3;
	display: flex;
	gap: 12px;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.filter-spacer {
	flex: 1 1 auto;
	min-width: 0;
}

.filter-actions {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: flex-end;
	flex: 0 0 auto;
}

.filter-row button {
	width: 36px;
	height: 36px;
	min-width: 36px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 36px;
	padding: 0;
	border: 1px solid var(--theme-button-border);
	border-radius: 50%;
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
}

.filter-row button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.filter-actions button svg,
.filter-actions button svg * {
	fill: currentColor !important;
	stroke: currentColor !important;
}

.filter-actions .delete-icon-svg,
.filter-actions .delete-icon-svg * {
	fill: currentColor !important;
	stroke: none !important;
}

.filter-actions button svg {
	display: block;
	width: 23px;
	height: 23px;
	margin: auto;
}

.filter-row .danger-button,
.filter-row .month-remove-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.year-filter {
	flex: 0 0 90px;
	min-width: 80px;
	max-width: 100px;
	height: 36px;
}

.month-filter {
	flex: 1;
	min-width: 0;
	height: 36px;
}

.wallet-card {
	position: sticky;
	top: 12px;
	z-index: 8;
	display: grid;
	gap: 28px;
	padding: 34px 32px 28px;
	width: 100%;
	justify-items: center;
	background:
		radial-gradient(circle at top center, color-mix(in srgb, var(--color-primary) 15%, transparent) 0%, transparent 36%),
		linear-gradient(180deg, rgba(35, 40, 50, 0.98) 0%, rgba(24, 27, 35, 0.98) 100%);
	border-color: color-mix(in srgb, var(--color-primary) 26%, var(--glass-border));
	box-shadow:
		0 22px 44px rgba(5, 10, 18, 0.28),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
	transition:
		padding 0.22s ease,
		gap 0.22s ease,
		border-radius 0.22s ease,
		transform 0.22s ease,
		box-shadow 0.22s ease;
}

.wallet-card-compact {
	gap: 14px;
	padding: 18px 20px 16px;
	border-radius: 18px;
}

.wallet-card-main {
	display: grid;
	gap: 6px;
	justify-items: center;
	text-align: center;
	width: 100%;
}

.wallet-label {
	margin: 0;
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.wallet-total {
	font-size: clamp(2.6rem, 5.2vw, 4.7rem);
	line-height: 1;
	letter-spacing: -0.06em;
	color: #f4f7fb;
	transition: font-size 0.22s ease;
}

.wallet-card-compact .wallet-total {
	font-size: clamp(1.8rem, 3.6vw, 2.5rem);
}

.wallet-asset-list {
	display: grid;
	gap: 8px;
	list-style: none;
	padding: 0;
	margin: 0;
	width: min(100%, 460px);
}

.wallet-card-compact .wallet-asset-list {
	gap: 6px;
}

.wallet-asset-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding-top: 8px;
}

.wallet-card-compact .wallet-asset-row {
	padding-top: 4px;
}

.wallet-asset-info {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.wallet-asset-dot {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 50%;
	background: var(--asset-color, var(--color-primary));
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--asset-color, var(--color-primary)) 16%, transparent);
}

.wallet-asset-name {
	min-width: 0;
	font-size: 1.05rem;
	font-weight: 500;
	color: rgba(232, 237, 244, 0.9);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.wallet-asset-value {
	font-size: 1rem;
	color: rgba(244, 247, 251, 0.78);
	white-space: nowrap;
}

.wallet-empty-state {
	padding-top: 8px;
	color: rgba(232, 237, 244, 0.82);
}

.asset-panel {
	position: relative;
	display: grid;
	gap: 12px;
	padding: 14px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
	box-shadow: var(--shadow);
}

.asset-title-row h3,
.empty-card h3 {
	margin: 0;
	color: var(--text-h);
}

.entry-value-card,
.metric-card {
	display: grid;
	gap: 8px;
	padding: 16px 18px;
	border-radius: 16px;
}

.entry-value-card span,
.metric-card span {
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.entry-value-card strong,
.metric-card strong {
	font-size: clamp(1.15rem, 2vw, 1.8rem);
	line-height: 1.1;
	color: var(--text-h);
}

.asset-list {
	display: grid;
	gap: 18px;
}

.asset-card {
	position: relative;
	display: grid;
	gap: 18px;
	width: 100%;
	min-width: 0;
	padding: 18px;
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
	-webkit-backdrop-filter: blur(22px);
	box-sizing: border-box;
}

.asset-card-top {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	gap: 18px;
}

.asset-identity {
	display: grid;
	gap: 0;
	flex: 1 1 auto;
}

.asset-title-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.asset-title-band {
	width: 100%;
	padding: 0;
	border-radius: 16px;
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--asset-color, var(--color-primary)) 12%, rgba(0, 0, 0, 0.28)) 0%, rgba(0, 0, 0, 0.16) 100%),
		rgba(0, 0, 0, 0.22);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.03),
		0 8px 16px rgba(0, 0, 0, 0.14);
	backdrop-filter: blur(18px);
	-webkit-backdrop-filter: blur(18px);
}

.asset-title-row-surface {
	padding: 14px 16px;
	border-radius: 16px;
	background: transparent;
}

.asset-color-dot {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 50%;
	background: var(--asset-color, #4F7CFF);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--asset-color, #4F7CFF) 16%, transparent);
}

.asset-info-table {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0;
	border: 1px solid rgba(255, 255, 255, 0.04);
	border-radius: 14px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.02);
}

.asset-info-row {
	display: grid;
	gap: 6px;
	padding: 12px 14px;
	border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.asset-info-row:last-child {
	border-right: 0;
}

.asset-info-label {
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.asset-info-value {
	color: var(--text-h);
}

.entry-value-card {
	min-width: 230px;
	background: rgba(255, 255, 255, 0.02);
	border-color: rgba(255, 255, 255, 0.04);
	align-self: stretch;
}

.home-metrics-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
}

.asset-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.action-button {
	padding: 14px 18px;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.08);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		rgba(24, 28, 38, 0.88);
	color: var(--text-soft);
	font-size: 1.02rem;
	font-weight: 700;
	cursor: not-allowed;
	opacity: 0.88;
}

.action-button-primary {
	border-color: color-mix(in srgb, var(--color-primary) 44%, transparent);
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
		color-mix(in srgb, var(--glass-surface-strong) 78%, transparent);
	color: var(--text-h);
}

.action-button-danger {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
}

.metric-card {
	background: rgba(255, 255, 255, 0.02);
	border: 1px solid rgba(255, 255, 255, 0.04);
}

.empty-card {
	display: grid;
	gap: 10px;
	padding: 22px;
}

.empty-card p {
	color: var(--text);
	line-height: 1.6;
}

.eyebrow {
	margin: 0;
	font-size: 0.8rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

@media (max-width: 1023px) {
	.asset-card-top,
	.home-metrics-grid {
		grid-template-columns: 1fr;
		display: grid;
	}

	.entry-value-card {
		min-width: 0;
	}

	.asset-info-table {
		grid-template-columns: 1fr;
	}

	.asset-info-row {
		border-right: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--asset-color, var(--glass-border)) 14%, var(--glass-border));
	}

	.asset-info-row:last-child {
		border-bottom: 0;
	}

	.wallet-card {
		top: 10px;
	}
}

@media (max-width: 640px) {
	.filter-row {
		align-items: center;
		flex-wrap: nowrap;
		gap: 6px;
	}

	.filter-spacer {
		display: none;
	}

	.filter-selects {
		display: flex;
		flex-wrap: nowrap;
		gap: 6px;
		flex: 1 1 auto;
		min-width: 0;
	}

	.filter-selects > .year-filter {
		flex: 0 0 72px;
		width: 72px;
		min-width: 72px;
		height: 32px;
		font-size: 12px;
		--app-select-min-height: 32px;
	}

	.filter-selects > .month-filter {
		flex: 1;
		min-width: 0;
		height: 32px;
		font-size: 12px;
		--app-select-min-height: 32px;
	}

	.filter-selects :deep(.app-select__trigger) {
		height: 100%;
		min-height: var(--app-select-min-height, 32px);
		padding: 4px 32px 4px 8px;
		font-size: inherit;
	}

	.filter-selects :deep(.app-select__chevron) {
		width: 14px;
		height: 14px;
	}

	.filter-actions {
		display: flex;
		gap: 6px;
		flex: 0 0 auto;
		margin-left: auto;
	}

	.filter-row button {
		width: 32px !important;
		height: 32px !important;
		min-width: 32px !important;
		flex: 0 0 32px !important;
	}

	.filter-actions button svg {
		width: 16px;
		height: 16px;
	}

	.wallet-card,
	.asset-panel,
	.asset-card,
	.entry-value-card,
	.metric-card,
	.empty-card {
		padding: 18px;
	}

	.wallet-total {
		font-size: 2.3rem;
	}

	.action-button {
		width: 100%;
		justify-content: center;
	}
}

@media (min-width: 1024px) {
	.filter-selects > .year-filter {
		width: 280px !important;
		flex: 0 0 280px !important;
		min-width: 280px !important;
		height: 48px;
		--app-select-min-height: 48px;
	}

	.filter-selects > .month-filter {
		flex: 1;
		min-width: 320px;
		height: 48px;
		--app-select-min-height: 48px;
	}

	.filter-selects :deep(.app-select__trigger) {
		height: 100%;
		min-height: var(--app-select-min-height, 48px);
	}

	.filter-row button {
		width: 48px;
		height: 48px;
		flex: 0 0 48px;
	}
}
</style>
