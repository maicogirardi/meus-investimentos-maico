# Publishing

## Estratégia

Manter o mesmo raciocínio do `financas-app`:

* GitHub Pages como canal secundário de desenvolvimento
* Firebase Hosting como canal principal para testes reais de autenticação e PWA

## Scripts

* `npm run build` gera a build com base `/meus-investimentos-maico/`
* `npm run deploy` publica a pasta `dist` no GitHub Pages
* `npm run build:firebase` troca temporariamente o `base` para `/` e faz o build
* `npm run deploy:firebase` roda o build do Firebase e publica no hosting

## Pendências

* criar repositório remoto privado `meus-investimentos-maico` no GitHub
* conectar o remoto localmente
* fazer o primeiro deploy no Firebase Hosting
* decidir se o GitHub Pages ficará ativo desde o início ou apenas como fallback de desenvolvimento
