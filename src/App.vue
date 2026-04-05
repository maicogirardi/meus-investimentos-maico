<script setup>
import { appMeta, planningCheckpoints, nextSteps } from "./config/appConfig";
</script>

<template>
  <div class="app-shell">
    <header class="hero-panel glass-panel">
      <div class="eyebrow">Projeto pessoal • investimentos • Vue + Firebase</div>
      <div class="hero-copy">
        <div>
          <p class="hero-kicker">Base inicial pronta para evoluir com telas e regras reais.</p>
          <h1>{{ appMeta.name }}</h1>
          <p class="hero-description">
            Estrutura blank com stack alinhada ao app de finanças, preparada para desktop first,
            PWA no mobile e autenticação Firebase como ambiente principal de testes reais.
          </p>
        </div>

        <div class="hero-actions">
          <a class="primary-button" :href="appMeta.primaryHost" target="_blank" rel="noreferrer">
            Host previsto
          </a>
          <span class="secondary-chip">{{ appMeta.repoName }}</span>
        </div>
      </div>
    </header>

    <main class="content-grid">
      <section class="glass-panel section-card">
        <div class="section-heading">
          <span class="section-index">01</span>
          <div>
            <h2>Checkpoints iniciais</h2>
            <p>Premissas capturadas para guiar a evolução do produto.</p>
          </div>
        </div>

        <ul class="checkpoint-list">
          <li v-for="item in planningCheckpoints" :key="item.title">
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
          </li>
        </ul>
      </section>

      <section class="glass-panel section-card">
        <div class="section-heading">
          <span class="section-index">02</span>
          <div>
            <h2>Próximas entregas</h2>
            <p>Roadmap curto para transformarmos esta base no app real.</p>
          </div>
        </div>

        <ol class="next-step-list">
          <li v-for="step in nextSteps" :key="step">{{ step }}</li>
        </ol>
      </section>

      <section class="glass-panel section-card section-card--wide">
        <div class="section-heading">
          <span class="section-index">03</span>
          <div>
            <h2>Escopo da primeira versão</h2>
            <p>
              Dashboard consolidado, visão por corretora/conta, classes de ativos e evolução do
              patrimônio com histórico salvo no Firebase.
            </p>
          </div>
        </div>

        <div class="feature-grid">
          <article>
            <h3>Painel principal</h3>
            <p>Resumo do patrimônio, alocação por classe, rentabilidade e alertas de rebalanceamento.</p>
          </article>

          <article>
            <h3>Dados</h3>
            <p>Firestore como fonte principal, listeners realtime e auth por usuário para uso privado.</p>
          </article>

          <article>
            <h3>Experiência</h3>
            <p>Desktop first, mas com adaptação sólida para tablet e mobile via layout fluido e PWA.</p>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

