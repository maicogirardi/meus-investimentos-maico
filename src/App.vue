<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { appMeta } from "./config/appConfig";
import { getFirebaseAuth, getFirebaseDb } from "./services/firebase";

const auth = getFirebaseAuth();
const db = getFirebaseDb();
const provider = new GoogleAuthProvider();

const status = ref("idle");
const errorMessage = ref("");
const currentUser = ref(null);
const userPreferences = ref({ darkMode: true, themeColor: "#00ccff" });

let unsubscribeAuth = null;
let unsubscribePreferences = null;

const isAuthenticated = computed(() => Boolean(currentUser.value));
const currentColor = computed(() => userPreferences.value.themeColor || "#00ccff");
const isDarkMode = computed(() => userPreferences.value.darkMode !== false);

const settingGroups = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "wallet", label: "Carteiras", icon: "▣" },
  { id: "grid", label: "Módulos", icon: "◫" },
  { id: "settings", label: "Config", icon: "⚙" },
];

function applyTheme() {
  document.documentElement.dataset.theme = isDarkMode.value ? "dark" : "light";
  document.documentElement.style.setProperty("--theme-accent", currentColor.value);
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
      themeColor: snapshot.data().themeColor || "#00ccff",
    };

    applyTheme();
  });
}

async function handleGoogleSignIn() {
  if (!auth) {
    errorMessage.value = "Firebase não inicializado. Verifique as variáveis de ambiente.";
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

  await signOut(auth);
}

onMounted(() => {
  applyTheme();

  if (!auth) {
    errorMessage.value = "Firebase não inicializado. Verifique as variáveis de ambiente.";
    return;
  }

  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    currentUser.value = user;

    if (user) {
      listenPreferences(user.uid);
      return;
    }

    unsubscribePreferences?.();
    userPreferences.value = { darkMode: true, themeColor: "#00ccff" };
    applyTheme();
  });
});

onUnmounted(() => {
  unsubscribeAuth?.();
  unsubscribePreferences?.();
});
</script>

<template>
  <div class="screen-shell">
    <main class="settings-page">
      <h1>{{ appMeta.name }}</h1>

      <section v-if="!isAuthenticated" class="panel card login-card">
        <h2>Autenticação</h2>
        <p>Entre com sua conta Google para abrir as configurações iniciais do app.</p>
        <button class="primary-btn" :disabled="status === 'loading'" @click="handleGoogleSignIn">
          {{ status === "loading" ? "Conectando..." : "Entrar com Google" }}
        </button>
      </section>

      <section v-else class="panel settings-card">
        <h2>Configurações</h2>

        <article class="setting-item">
          <div>
            <h3>Dark Mode</h3>
            <p>Alterna entre light e dark mode.</p>
          </div>
          <button class="toggle" :class="{ 'toggle--active': isDarkMode }" @click="savePreferences({ darkMode: !isDarkMode })">
            <span></span>
          </button>
        </article>

        <article class="setting-item">
          <div>
            <h3>Cor do Tema</h3>
          </div>
          <label class="color-row" for="theme-color">
            <input
              id="theme-color"
              type="color"
              :value="currentColor"
              @input="savePreferences({ themeColor: $event.target.value })"
            />
            <span>{{ currentColor }}</span>
          </label>
        </article>

        <article class="setting-item account-item">
          <div>
            <h3>Conta</h3>
            <p>Logado como: {{ currentUser?.email }}</p>
          </div>
          <button class="danger-btn" @click="handleSignOut">Encerrar sessão</button>
        </article>
      </section>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </main>

    <nav class="bottom-nav" aria-label="Navegação principal">
      <button v-for="item in settingGroups" :key="item.id" :class="['nav-btn', { 'nav-btn--active': item.id === 'settings' }]">
        <span aria-hidden="true">{{ item.icon }}</span>
      </button>
    </nav>
  </div>
</template>
