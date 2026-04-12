## Persistence

Este projeto deve manter alinhamento técnico e de documentação com o repositório `financas-app` sempre que isso não conflitar com o domínio de investimentos.

## Product Direction

Use este app como plataforma pessoal de investimentos com foco em:

- visão consolidada de patrimônio
- acompanhamento por instituição, conta, carteira e classe de ativo
- histórico de aportes, movimentações e snapshots de patrimônio
- futura expansão para metas, rebalanceamento e indicadores pessoais

## Platform Rules

- usar Vue 3 + Vite como stack principal
- usar Firebase Auth para acesso privado
- usar Firestore como banco principal
- usar o banco Firestore default em `southamerica-east1`
- usar listeners realtime sempre que fizer sentido no fluxo principal
- não usar localStorage como fonte primária de dados
- GitHub Pages continua como ambiente secundário de desenvolvimento
- Firebase Hosting deve ser o ambiente principal para testes reais de auth e PWA
- manter documentação `.md` atualizada quando arquitetura, fluxo ou publicação mudarem

## UI Rules

- layout desktop first com adaptação sólida para tablet e mobile
- aparência premium, clara e intencional, evitando layout genérico
- dashboard deve priorizar leitura rápida do patrimônio e da alocação
- componentes e páginas devem nascer com consistência visual entre este app e o `financas-app`
- PWA deve continuar viável para uso no celular

## Initial Collections

Coleções iniciais previstas no Firestore:

- institutions
- accounts
- assets
- holdings
- transactions
- snapshots
- userPreferences

## Publishing Workflow

Quando o usuário pedir para publicar, o fluxo padrão deve ser:

- revisar mudanças relevantes
- incluir por padrão nos commits e publicações todas as modificações locais feitas pelo usuário, salvo quando ele pedir explicitamente para separar ou excluir algo
- atualizar documentação `.md` impactada
- criar commit
- enviar para o branch remoto principal
- publicar no GitHub Pages se esse fluxo continuar habilitado
- publicar no Firebase Hosting para testes reais

Host principal confirmado:

- https://meus-investimentos-maico.web.app

GitHub Pages previsto:

- https://maicogirardi.github.io/meus-investimentos-maico/
