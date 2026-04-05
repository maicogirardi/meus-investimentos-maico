<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import BottomTabs from "./components/navigation/BottomTabs.vue";
import { appMeta } from "./config/appConfig";
import AppLayout from "./layout/AppLayout.vue";
import { getFirebaseAuth, getFirebaseDb } from "./services/firebase";
import ConfiguracoesView from "./views/ConfiguracoesView.vue";

const auth = getFirebaseAuth();
const db = getFirebaseDb();
const provider = new GoogleAuthProvider();

const status = ref("idle");
const errorMessage = ref("");
const currentUser = ref(null);
const authReady = ref(false);
const isUpdateAvailable = ref(false);
const currentPage = ref("settings");
const userPreferences = ref({ darkMode: true, themeColor: "#4f7cff" });

let unsubscribeAuth = null;
let unsubscribePreferences = null;
let triggerAppUpdate = null;

const isAuthenticated = computed(() => Boolean(currentUser.value));
const theme = computed(() => (userPreferences.value.darkMode !== false ? "dark" : "light"));
const currentColor = computed(() => userPreferences.value.themeColor || "#4f7cff");
const isHomePage = computed(() => currentPage.value === "home");

const navigationTabs = [
  { value: "home", label: "Home", icon: "home" },
  { value: "wallets", label: "Carteiras", icon: "wallet" },
  { value: "modules", label: "Módulos", icon: "grid" },
  { value: "settings", label: "Configurações", icon: "settings" },
];

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

function applyTheme() {
  const activeTheme = theme.value;
  const accent = currentColor.value;

  document.documentElement.setAttribute("data-theme", activeTheme);
  document.documentElement.style.setProperty("--color-primary", accent);
  document.documentElement.style.setProperty("--color-primary-soft", mixHex(accent, { r: 255, g: 255, b: 255 }, 0.45));
  document.documentElement.style.setProperty("--theme-accent", accent);
  syncBrowserThemeColor(activeTheme);
}

async function savePreferences(patch) {
  if (!currentUser.value || !db) {
    return;
  }

  const nextPreferences = { ...userPreferences.value, ...patch };
  userPreferences.value = nextPreferences;
  applyTheme();

  try {
    await setDoc(
      doc(db, "userPreferences", currentUser.value.uid),
      {
        uid: currentUser.value.uid,
        darkMode: nextPreferences.darkMode,
        themeColor: nextPreferences.themeColor,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    errorMessage.value = "Não foi possível salvar a preferência agora.";
  }
}

function listenPreferences(uid) {
  if (!db) {
    return;
  }

  unsubscribePreferences?.();
  unsubscribePreferences = onSnapshot(doc(db, "userPreferences", uid), async (snapshot) => {
    if (!snapshot.exists()) {
      await savePreferences(userPreferences.value);
      return;
    }

    userPreferences.value = {
      darkMode: snapshot.data().darkMode !== false,
      themeColor: snapshot.data().themeColor || "#4f7cff",
    };
    applyTheme();
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
  userPreferences.value = { darkMode: true, themeColor: "#4f7cff" };
  applyTheme();
}

onMounted(() => {
  applyTheme();
  window.addEventListener("app-update-available", handleAppUpdateAvailable);

  if (!auth) {
    authReady.value = true;
    errorMessage.value = "Firebase não inicializado. Verifique a configuração do projeto.";
    return;
  }

  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user;
    authReady.value = true;

    if (user) {
      errorMessage.value = "";
      listenPreferences(user.uid);
      return;
    }

    clearUserState();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("app-update-available", handleAppUpdateAvailable);
  unsubscribeAuth?.();
  unsubscribePreferences?.();
});
</script>

<template>
  <AppLayout>
    <div class="app-page">
      <section v-if="isUpdateAvailable" class="update-banner">
        <div class="update-banner-copy">
          <strong>Nova versão disponível</strong>
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

      <header v-if="isHomePage" class="hero-card page-section">
        <div class="hero-copy">
          <p class="eyebrow">Plataforma pessoal de patrimônio</p>
          <h1>{{ appMeta.name }}</h1>
          <p class="hero-description">
            Acompanhamento pessoal de patrimônio, alocação e evolução dos investimentos com uma interface premium e consistente.
          </p>
        </div>
      </header>

      <h1 v-if="!isHomePage" class="tittle">{{ appMeta.name }}</h1>

      <div v-if="!authReady" class="page-section status-card">
        <strong>Carregando autenticação...</strong>
      </div>

      <ConfiguracoesView
        v-else
        v-show="currentPage === 'settings'"
        class="management-page-section"
        :theme="theme"
        :theme-color="currentColor"
        :user-email="currentUser?.email || ''"
        :is-authenticated="isAuthenticated"
        :is-submitting="status === 'loading'"
        :auth-error="errorMessage"
        @update-theme="savePreferences({ darkMode: $event === 'dark' })"
        @update-theme-color="savePreferences({ themeColor: $event })"
        @login="handleGoogleSignIn"
        @logout="handleSignOut"
      />

      <BottomTabs :tabs="navigationTabs" :current-tab="currentPage" @select="currentPage = $event" />
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
.hero-card {
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

.hero-card {
  overflow: hidden;
  min-height: 220px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--glass-surface-strong) 94%, transparent) 0%, var(--glass-surface) 100%);
}

.hero-copy {
  width: min(100%, 680px);
  display: grid;
  gap: 12px;
}

.eyebrow {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.hero-description {
  max-width: 56ch;
  color: var(--text);
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

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: var(--button-bg);
  color: var(--button-text);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--button-shadow);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;
}

.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--button-shadow-hover);
  filter: saturate(1.06);
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

@media (min-width: 481px) and (max-width: 1023px) {
  .app-page {
    padding-inline: 18px;
  }

  .page-section,
  .status-card,
  .hero-card {
    padding: 16px;
  }

  .management-page-section {
    width: min(100%, 560px);
  }
}

@media (max-width: 480px) {
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
  .status-card,
  .hero-card {
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
}
</style>
