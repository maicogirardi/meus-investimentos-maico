<script setup>
import AppSelect from "../components/ui/AppSelect.vue";

defineProps({
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
});

defineEmits(["update:year", "update:month", "add-month", "delete-month"]);

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <section class="portfolio-card">
      <template v-if="hasSelectedPeriod">
        <p class="eyebrow">Saldo total da carteira</p>
        <strong>{{ formatCurrency(0) }}</strong>
        <span>{{ periodLabel }}</span>
      </template>

      <template v-else>
        <p class="eyebrow">Comece pela sua linha do tempo</p>
        <strong>Nenhum mês criado.</strong>
        <span>Use o botão de adicionar para escolher o primeiro mês da carteira.</span>
      </template>
    </section>
  </section>
</template>

<style scoped>
.home-view {
  display: grid;
  gap: 22px;
  width: 100%;
}

.filter-card {
  position: relative;
  z-index: 12;
  overflow: visible;
  display: grid;
  padding: 16px;
  border: 1px solid var(--glass-border);
  border-radius: 22px;
  background: var(--glass-surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(22px);
}

.portfolio-card {
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass-surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(11px);
}

.filter-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
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

.filter-row select {
  flex: 0 1 auto;
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
	width: 48px;
	height: 48px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 48px;
	padding: 0;
	border: 1px solid var(--theme-button-border);
	border-radius: 50%;
	aspect-ratio: 1 / 1;
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

.filter-row button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

.filter-row button:focus-visible {
	border-color: color-mix(in srgb, var(--color-primary) 54%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 3px color-mix(in srgb, var(--color-primary) 18%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.filter-row button:active:not(:disabled) {
	transform: translateY(0);
	border-color: color-mix(in srgb, var(--color-primary) 58%, var(--theme-button-hover-border));
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--color-primary) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.filter-row button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
	transform: none;
}

.filter-actions button {
	color: var(--text-soft);
}

.filter-actions button:hover {
	color: var(--text-h);
}

.filter-row .danger-button,
.filter-row .month-remove-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.filter-row .danger-button:hover,
.filter-row .month-remove-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
}

.filter-row .danger-button:focus-visible,
.filter-row .danger-button:active:not(:disabled),
.filter-row .month-remove-button:focus-visible,
.filter-row .month-remove-button:active:not(:disabled) {
	border-color: var(--danger-border-strong);
	box-shadow:
		0 0 0 2px color-mix(in srgb, var(--danger-text) 14%, transparent),
		inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.filter-actions .danger-button,
.filter-actions .month-remove-button {
	color: var(--danger-text);
}

.filter-actions button svg,
.filter-actions button svg * {
	fill: currentColor !important;
	stroke: currentColor !important;
}

.filter-actions button svg {
	display: block;
	width: 23px;
	height: 23px;
	margin: auto;
	flex: 0 0 auto;
}

.filter-row button {
	width: 36px;
	height: 36px;
	min-width: 36px;
	padding: 0;
	border-radius: 50%;
	flex: 0 0 36px;
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

.month-remove-button svg {
	transform: translateX(1px);
}

.portfolio-card {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 236px;
  padding: 28px 24px;
  text-align: center;
  background:
    radial-gradient(circle at top center, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 48%),
    linear-gradient(180deg, color-mix(in srgb, var(--glass-surface-strong) 96%, transparent) 0%, var(--glass-surface) 100%);
}

.portfolio-card strong {
  font-size: clamp(2.25rem, 5vw, 4.2rem);
  line-height: 1;
  letter-spacing: -0.06em;
  color: var(--text-h);
}

.portfolio-card span {
  color: var(--text);
  max-width: 36ch;
}

.eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-soft);
}

@media (min-width: 641px) and (max-width: 1023px) {
  .filter-card {
    padding: 16px;
  }

  .filter-row {
    gap: 10px;
  }

  .filter-selects {
    gap: 10px;
    flex: 1 1 auto;
    min-width: 0;
  }

  .filter-selects > .year-filter {
    flex: 0 0 96px;
    min-width: 96px;
    max-width: 112px;
    --app-select-min-height: 40px;
  }

  .filter-selects > .month-filter {
    flex: 1 1 140px;
    min-width: 0;
    max-width: none;
    --app-select-min-height: 40px;
  }

  .filter-selects :deep(.app-select__trigger) {
    min-height: var(--app-select-min-height, 40px);
    padding-inline: 12px 38px;
  }

  .filter-actions {
    gap: 10px;
  }

  .filter-row button {
    width: 40px;
    height: 40px;
    min-width: 40px;
    flex: 0 0 40px;
  }

  .portfolio-card {
    min-height: 210px;
    padding: 24px 20px;
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
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 13px;
  }

  .filter-actions button svg {
    display: block;
    width: 16px;
    height: 16px;
    margin: auto;
    flex: 0 0 auto;
  }

  .filter-actions button svg * {
    vector-effect: non-scaling-stroke;
  }

  .month-remove-button svg {
    width: 15px;
    height: 15px;
    transform: translateX(1px);
  }

  .portfolio-card {
    min-height: 190px;
    padding: 22px 18px;
    border-radius: 20px;
  }
}

@media (min-width: 1024px) {
  .filter-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 16px;
    border-radius: 20px;
    border: 1px solid var(--glass-border);
    background: var(--glass-surface);
    backdrop-filter: blur(11px);
  }

  .filter-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;
  }

  .filter-selects {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 8px;
  }

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
    padding: 0;
    border-radius: 50%;
    aspect-ratio: 1 / 1;
  }

  .month-remove-button svg {
    transform: translateX(1px);
  }
}
</style>
