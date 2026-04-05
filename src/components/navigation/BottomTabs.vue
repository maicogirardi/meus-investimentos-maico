<script setup>
function getIconPaths(iconName) {
  switch (iconName) {
    case "wallet":
      return [
        "M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A1.5 1.5 0 0 1 18.75 6.75v10.5A1.5 1.5 0 0 1 17.25 18.75H6A2.25 2.25 0 0 1 3.75 16.5v-9Z",
        "M3.75 8.25h13.5",
        "M15.75 12h3",
        "M16.875 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
      ];
    case "grid":
      return [
        "M4.5 4.5h6v6h-6z",
        "M13.5 4.5h6v6h-6z",
        "M4.5 13.5h6v6h-6z",
        "M13.5 13.5h6v6h-6z",
      ];
    case "settings":
      return [
        "M10.343 3.94c.09-.542.56-.94 1.11-.94h1.094c.55 0 1.02.398 1.11.94l.1.602c.062.37.313.681.657.82.344.138.736.084 1.033-.125l.484-.34a1.125 1.125 0 0 1 1.454.133l.773.773c.39.39.444.997.133 1.454l-.34.484c-.209.297-.263.689-.125 1.033.139.344.45.595.82.657l.602.1c.542.09.94.56.94 1.11v1.094c0 .55-.398 1.02-.94 1.11l-.602.1a1.125 1.125 0 0 0-.82.657c-.138.344-.084.736.125 1.033l.34.484c.311.457.257 1.064-.133 1.454l-.773.773a1.125 1.125 0 0 1-1.454.133l-.484-.34a1.125 1.125 0 0 0-1.033-.125c-.344.139-.595.45-.657.82l-.1.602c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.02-.398-1.11-.94l-.1-.602a1.125 1.125 0 0 0-.657-.82 1.125 1.125 0 0 0-1.033.125l-.484.34a1.125 1.125 0 0 1-1.454-.133l-.773-.773a1.125 1.125 0 0 1-.133-1.454l.34-.484c.209-.297.263-.689.125-1.033a1.125 1.125 0 0 0-.82-.657l-.602-.1a1.125 1.125 0 0 1-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.602-.1c.37-.062.681-.313.82-.657.138-.344.084-.736-.125-1.033l-.34-.484a1.125 1.125 0 0 1 .133-1.454l.773-.773a1.125 1.125 0 0 1 1.454-.133l.484.34c.297.209.689.263 1.033.125.344-.139.595-.45.657-.82l.1-.602Z",
        "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
      ];
    case "home":
    default:
      return [
        "M3.75 10.5 12 3.75l8.25 6.75",
        "M5.25 9.75v9h13.5v-9",
        "M10.125 18.75v-4.5h3.75v4.5",
      ];
  }
}

defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  currentTab: {
    type: String,
    default: "",
  },
});

defineEmits(["select"]);
</script>

<template>
  <nav class="bottom-tabs" aria-label="Navegacao principal">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="tab-button"
      :class="{ active: currentTab === tab.value }"
      type="button"
      :aria-label="tab.label"
      :title="tab.label"
      @click="$emit('select', tab.value)"
    >
      <span class="tab-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" class="tab-icon-svg">
          <path
            v-for="iconPath in getIconPaths(tab.icon || 'home')"
            :key="iconPath"
            :d="iconPath"
          />
        </svg>
      </span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 12px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--surface-elevated) 84%, transparent);
  border-top: 1px solid var(--glass-border);
  backdrop-filter: blur(22px);
  z-index: 20;
  box-sizing: border-box;
  justify-content: center;
}

.tab-button {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--theme-button-border);
  border-radius: 999px;
  background: var(--theme-button-bg);
  color: var(--text-soft);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.tab-button:hover {
  transform: translateY(-1px);
  border-color: var(--theme-button-hover-border);
  color: var(--text-h);
}

.tab-button.active {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--glass-border-strong));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, rgba(255, 255, 255, 0) 100%),
    var(--glass-surface-strong);
  color: var(--text-h);
  box-shadow:
    0 10px 22px rgba(15, 17, 21, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  transform: translateY(-1px);
}

.tab-icon {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
}

.tab-icon-svg {
  width: 28px;
  height: 28px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 640px) {
  .bottom-tabs {
    gap: 10px;
    padding-inline: 12px;
    justify-content: center;
  }

  .tab-button {
    width: 54px;
    height: 54px;
    flex: 0 0 auto;
  }
}
</style>
