<template>
  <section class="placeholder-view">
    <h2>Resumo</h2>
    <p>Esta área vai concentrar o histórico diário, totais do mês e totais do ano por ativo.</p>
  </section>
</template>

<style scoped>
.placeholder-view {
  display: grid;
  gap: 10px;
  padding: 22px;
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  background: var(--glass-surface);
  box-shadow: var(--shadow);
  backdrop-filter: blur(22px);
}

.placeholder-view p {
  color: var(--text);
}
</style>
