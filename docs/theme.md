# Theme System

O app suporta Light e Dark mode com a mesma fundação visual do `financas-app`.

## Controle global

Tema aplicado em:

* `document.documentElement`
* `data-theme="light"`
* `data-theme="dark"`
* `meta[name="theme-color"]` sincronizado com o tema ativo para navegador mobile e PWA

Cor principal aplicada em:

* `--color-primary`
* `--color-primary-soft`
* `--theme-accent`

## Fonte de verdade

Preferências persistidas em:

* `userPreferences/{uid}`

Campos atuais:

* `darkMode`
* `themeColor`

## Arquivos-base

Arquivos espelhados do `financas-app`:

* `src/styles/variables.css`
* `src/styles/theme.css`
* `src/style.css`
* `src/views/ConfiguracoesView.vue`
* `src/components/navigation/BottomTabs.vue`
* `src/main.js`
* `public/sw.js`

## Diretriz visual

Regras deste app:

* manter a mesma hierarquia visual e comportamento do app de finanças sempre que houver equivalente
* quando existir uma página equivalente no `financas-app`, copiar literalmente textos, proporções e espaçamentos dessa página
* preservar suporte completo a light/dark e à cor personalizada do usuário
* usar fundo dark em azul-marinho profundo, em vez do preto predominante do `financas-app`
* refletir a cor escolhida em botões, navegação, superfícies destacadas e elementos de foco
* manter o banner de atualização do PWA com o mesmo padrão de interação do app de finanças

## Processo

Antes de criar novos componentes de UI:

* procurar primeiro no `financas-app` uma implementação equivalente
* reaproveitar estrutura, proporção, espaçamento, tipografia e estados visuais
* para páginas equivalentes, copiar primeiro de forma literal e adaptar apenas o necessário para o domínio de investimentos
