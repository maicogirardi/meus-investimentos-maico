# Publishing

## Estratégia

Manter o mesmo raciocínio do `financas-app`:

* GitHub Pages como canal secundário de desenvolvimento, publicado por GitHub Actions
* Firebase Hosting como canal principal para testes reais de autenticação e PWA

## Scripts

* `npm run build` gera a build com base `/meus-investimentos-maico/`
* `npm run deploy` continua disponível para fluxo com `gh-pages`, se necessário
* `npm run build:firebase` roda `vite build --mode firebase` e gera a build com base `/`
* `npm run deploy:firebase` roda o build do Firebase e publica no hosting

## GitHub Pages

* workflow criado em `.github/workflows/deploy-pages.yml`
* a URL esperada é `https://maicogirardi.github.io/meus-investimentos-maico/`
* o repositório deve usar `Settings > Pages > Source: GitHub Actions`

## Pendências

* criar repositório remoto privado `meus-investimentos-maico` no GitHub
* fazer o primeiro run bem-sucedido do workflow de Pages
* decidir se o script `npm run deploy` seguirá como fallback manual ou será removido depois
