<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: "",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  invalid: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const rootRef = ref(null);
const isOpen = ref(false);
const highlightedIndex = ref(-1);
const placement = ref("bottom");

const normalizedOptions = computed(() =>
  props.options.map((option) => ({
    label: String(option?.label ?? ""),
    value: option?.value,
    disabled: Boolean(option?.disabled),
  })),
);

const selectedOption = computed(() =>
  normalizedOptions.value.find((option) => Object.is(option.value, props.modelValue)),
);

const displayLabel = computed(() => selectedOption.value?.label || props.placeholder || "");
const showPlaceholder = computed(() => !selectedOption.value);

watch(
  () => props.modelValue,
  () => {
    if (!isOpen.value) return;
    highlightedIndex.value = getSelectedIndex();
  },
);

watch(isOpen, async (open) => {
  if (open) {
    updatePlacement();
    highlightedIndex.value = getInitialHighlightedIndex();
    await nextTick();
    scrollHighlightedOptionIntoView();
    return;
  }

  highlightedIndex.value = -1;
});

watch(highlightedIndex, async (index) => {
  if (index < 0 || !isOpen.value) return;
  await nextTick();
  scrollHighlightedOptionIntoView();
});

function getSelectedIndex() {
  return normalizedOptions.value.findIndex((option) => Object.is(option.value, props.modelValue));
}

function getInitialHighlightedIndex() {
  const selectedIndex = getSelectedIndex();
  if (selectedIndex >= 0 && !normalizedOptions.value[selectedIndex]?.disabled) {
    return selectedIndex;
  }

  return normalizedOptions.value.findIndex((option) => !option.disabled);
}

function updatePlacement() {
  if (!rootRef.value || typeof window === "undefined") return;

  const bounds = rootRef.value.getBoundingClientRect();
  const roomBelow = window.innerHeight - bounds.bottom;
  placement.value = roomBelow < 260 ? "top" : "bottom";
}

function openMenu() {
  if (props.disabled || normalizedOptions.value.length === 0) return;
  isOpen.value = true;
}

function closeMenu() {
  isOpen.value = false;
}

function toggleMenu() {
  if (isOpen.value) {
    closeMenu();
    return;
  }

  openMenu();
}

function selectOption(option) {
  if (option.disabled) return;
  emit("update:modelValue", option.value);
  closeMenu();
}

function moveHighlight(direction) {
  const enabledIndexes = normalizedOptions.value
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  if (enabledIndexes.length === 0) return;

  if (!isOpen.value) {
    openMenu();
    return;
  }

  const currentEnabledIndex = enabledIndexes.findIndex((index) => index === highlightedIndex.value);
  if (currentEnabledIndex === -1) {
    highlightedIndex.value = enabledIndexes[0];
    return;
  }

  const nextIndex = (currentEnabledIndex + direction + enabledIndexes.length) % enabledIndexes.length;
  highlightedIndex.value = enabledIndexes[nextIndex];
}

function highlightBoundary(position) {
  const enabledIndexes = normalizedOptions.value
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  if (enabledIndexes.length === 0) return;
  if (!isOpen.value) openMenu();
  highlightedIndex.value = position === "start" ? enabledIndexes[0] : enabledIndexes[enabledIndexes.length - 1];
}

function handleTriggerKeydown(event) {
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      moveHighlight(1);
      return;
    case "ArrowUp":
      event.preventDefault();
      moveHighlight(-1);
      return;
    case "Enter":
    case " ":
      event.preventDefault();
      toggleMenu();
      return;
    case "Escape":
      event.preventDefault();
      closeMenu();
      return;
    case "Home":
      event.preventDefault();
      highlightBoundary("start");
      return;
    case "End":
      event.preventDefault();
      highlightBoundary("end");
      return;
    default:
      return;
  }
}

function handleOptionKeydown(event, option, index) {
  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      moveHighlight(1);
      return;
    case "ArrowUp":
      event.preventDefault();
      moveHighlight(-1);
      return;
    case "Enter":
    case " ":
      event.preventDefault();
      selectOption(option);
      return;
    case "Escape":
      event.preventDefault();
      closeMenu();
      return;
    case "Home":
      event.preventDefault();
      highlightBoundary("start");
      return;
    case "End":
      event.preventDefault();
      highlightBoundary("end");
      return;
    case "Tab":
      closeMenu();
      return;
    default:
      highlightedIndex.value = index;
  }
}

function handlePointerDown(event) {
  if (!rootRef.value?.contains(event.target)) {
    closeMenu();
  }
}

function scrollHighlightedOptionIntoView() {
  if (!rootRef.value) return;

  const element = rootRef.value.querySelector(`[data-option-index="${highlightedIndex.value}"]`);
  if (!(element instanceof HTMLElement)) return;
  element.scrollIntoView({ block: "nearest" });
}

watch(isOpen, (open) => {
  if (typeof document === "undefined") return;

  if (open) {
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return;
  }

  document.removeEventListener("pointerdown", handlePointerDown);
  window.removeEventListener("resize", updatePlacement);
  window.removeEventListener("scroll", updatePlacement, true);
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("pointerdown", handlePointerDown);
  }

  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updatePlacement);
    window.removeEventListener("scroll", updatePlacement, true);
  }
});
</script>

<template>
  <div
    ref="rootRef"
    class="app-select"
    :class="{
      'is-open': isOpen,
      'is-disabled': disabled,
      'is-invalid': invalid,
      'is-placeholder': showPlaceholder,
      'is-top': placement === 'top',
    }"
    @keydown.stop
  >
    <button
      type="button"
      class="app-select__trigger"
      :disabled="disabled"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      @click.stop="toggleMenu"
      @keydown.stop="handleTriggerKeydown"
    >
      <span
        class="app-select__label"
        :class="{
          'is-placeholder': showPlaceholder,
          'is-invalid': invalid && showPlaceholder,
        }"
      >
        {{ displayLabel }}
      </span>

      <svg class="app-select__chevron" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 6.25L8 10.75L12.5 6.25" />
      </svg>
    </button>

    <div v-if="isOpen" class="app-select__menu" role="listbox">
      <button
        v-for="(option, index) in normalizedOptions"
        :key="`${option.label}-${index}`"
        type="button"
        class="app-select__option"
        :class="{
          'is-selected': Object.is(option.value, modelValue),
          'is-highlighted': index === highlightedIndex,
          'is-disabled': option.disabled,
        }"
        :aria-selected="Object.is(option.value, modelValue)"
        :tabindex="index === highlightedIndex ? 0 : -1"
        :data-option-index="index"
        @click.stop="selectOption(option)"
        @keydown.stop="handleOptionKeydown($event, option, index)"
        @mouseenter="!option.disabled && (highlightedIndex = index)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
  min-width: 0;
}

.app-select__trigger,
.app-select__option {
  font: inherit;
}

.app-select__trigger {
  position: relative;
  width: 100%;
  height: var(--app-select-height, auto);
  min-height: var(--app-select-min-height, 46px);
  padding: 10px 52px 10px 12px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  border: 1px solid var(--select-border, var(--input-border));
  border-radius: 14px;
  background: var(--select-surface, var(--input-surface));
  color: var(--input-text);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.app-select__trigger:focus-visible {
  outline: none;
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.app-select__label {
  min-width: 0;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--input-text);
}

.app-select__label.is-placeholder {
  color: var(--input-placeholder);
}

.app-select__label.is-invalid {
  color: var(--validation-error-text);
  font-style: italic;
}

.app-select__chevron {
  position: absolute;
  right: 14px;
  top: 50%;
  width: 16px;
  height: 16px;
  transform: translateY(-50%);
  color: var(--select-arrow);
  transition: transform 0.18s ease, top 0.18s ease;
}

.app-select__chevron path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.app-select.is-open .app-select__chevron {
  transform: translateY(-50%) rotate(180deg);
}

.app-select__menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 35;
  display: grid;
  gap: 4px;
  padding: 8px;
  border: 1px solid var(--select-border, var(--input-border));
  border-radius: 18px;
  background: var(--select-option-bg);
  backdrop-filter: blur(22px);
  max-height: min(280px, 50vh);
  overflow-y: auto;
}

.app-select.is-top .app-select__menu {
  top: auto;
  bottom: calc(100% + 8px);
}

.app-select__option {
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--select-option-text);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.14s ease,
    color 0.14s ease;
}

.app-select__option.is-highlighted,
.app-select__option:hover {
  background: var(--select-option-hover-bg);
}

.app-select__option.is-selected {
  background: var(--select-option-selected-bg);
  color: var(--select-option-selected-text);
}

.app-select__option.is-disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.app-select.is-invalid .app-select__trigger {
  border-color: var(--validation-error-border);
  box-shadow: 0 0 0 2px var(--validation-error-ring);
}

.app-select.is-disabled .app-select__trigger {
  cursor: not-allowed;
  background: var(--input-disabled-bg);
  color: var(--text-soft);
  opacity: 0.88;
}

@media (max-width: 480px) {
  .app-select__trigger {
    min-height: var(--app-select-min-height, 42px);
    padding-block: 8px;
  }

  .app-select__menu {
    max-height: min(240px, 46vh);
  }

  .app-select__option {
    padding: 11px 12px;
  }
}
</style>
