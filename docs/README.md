# Docs

## Fonte de verdade

Esta pasta concentra a documentacao viva do app. A leitura recomendada a partir de agora e:

1. `product.md`
2. `business_rules.md`
3. `data_model.md`
4. `architecture.md`
5. `firebase.md`
6. `theme.md`
7. `publishing.md`
8. `roadmap.md`

## Papel de cada arquivo

### Estrategia e produto

* `product.md`: visao funcional do app, fluxo principal e estrutura das telas.
* `product-plan.md`: resumo executivo do momento atual, decisoes fechadas e proximos marcos.
* `roadmap.md`: sequencia prevista de evolucao do produto.

### Regras funcionais

* `business_rules.md`: regras de calculo, conceitos financeiros internos e validacoes.
* `data_model.md`: modelagem hibrida mensal/diaria recomendada para suportar calculo e historico.

### Plataforma

* `architecture.md`: direcao tecnica, modulos, responsabilidades e encaixe da modelagem no app Vue/Firebase.
* `firebase.md`: organizacao no Firestore, Auth, regras de segregacao por usuario e proximos passos de backend.
* `theme.md`: sistema visual e alinhamento com o `financas-app`.
* `publishing.md`: fluxo de publicacao em GitHub Pages e Firebase Hosting.

### Referencia operacional

* `codex_prompt.md`: referencia historica de briefing consolidado para implementacao assistida por IA. E util como contexto, mas nao substitui `product.md`, `business_rules.md` e `data_model.md`.

## Decisao de integracao

Os quatro arquivos adicionados mais recentemente passam a complementar e detalhar a documentacao anterior:

* `product.md` aprofunda a visao de produto.
* `business_rules.md` define as formulas e regras de negocio.
* `data_model.md` detalha a modelagem operacional.
* `codex_prompt.md` fica como briefing de apoio.

Os arquivos mais antigos foram ajustados para refletir essas definicoes e evitar concorrencia entre documentos.
