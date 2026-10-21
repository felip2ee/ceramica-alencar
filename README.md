# Site Cerâmicas Alencar

Página única, estática, sem build: HTML, CSS e JavaScript com módulos ES. GSAP vem do cdnjs. Node ≥ 20.10 (atributos de import em JSON) só para os testes e para regenerar as figuras.

A pasta a publicar é `site/`. `midia/` (na raiz do repositório) guarda mídia bruta e não publicada: vídeos do Flow (exceto o da materialidade, que está em `site/assets/flow/`) e alternativas de imagem. As capturas de verificação ficam em `docs/capturas-site/`.

## Servir

```bash
npx serve site            # abre em http://localhost:3000
npm test                  # node --test site/tests/
```

## Rever a abertura

A abertura (plaquetas assentando na forma da logo) roda uma vez por navegador e guarda `alencar:abertura=1` no `localStorage`. Para vê-la de novo: `http://localhost:3000/?abertura=1`. Com `prefers-reduced-motion: reduce` ela não roda. Um pequeno script no `<head>` só evita o flash do marfim para quem já viu a abertura; a regra de verdade é `deveRodarAbertura` em `lib/abertura.mjs`.

## Publicar (Portainer Swarm + Traefik)

Só a pasta `site/` vai para o repositório público (github.com/felip2ee/ceramica-alencar) e para a imagem; o repositório local completo (pesquisa, docs, mídia) fica privado. `deploy/publicar.sh` faz as duas coisas: constrói a imagem `linux/amd64` com `Dockerfile` + `deploy/nginx.conf` (gzip, cache longo para imagens, revalidação para HTML e código), envia para `ghcr.io/felip2ee/ceramica-alencar:latest` e força o `git subtree split` de `site/` em `origin/main`. Uma vez só: `gh auth refresh -h github.com -s write:packages,read:packages`.

```bash
site/deploy/publicar.sh
```

`docker-stack.yml` sobe o serviço no Portainer com os rótulos do Traefik para `ceramicaalencar.dgtnova.com`; a rede externa precisa ser a mesma do Traefik (`docker network ls --filter driver=overlay` no manager). Teste local: `docker build -t ceramica-alencar site && docker run --rm -p 8080:80 ceramica-alencar`.

Domínio final já está no `og:image` (`https://ceramicaalencar.dgtnova.com/...`). Palavra "amostra" no texto visível só entra depois de confirmada com a Cerâmicas Alencar. A classe `.amostra` dos cartões de tom é nome interno e não aparece para o visitante.

## Imagens

As imagens conceituais do Google Flow ficam em `assets/flow/` (1200 × 896). Cada uma usada na página tem uma variante de 800 px (`<nome>-800.jpg`) servida por `srcset`/`sizes`. Para gerar uma nova variante:

```bash
sips -s format jpeg -s formatOptions 80 -Z 800 site/assets/flow/<nome>.jpg --out site/assets/flow/<nome>-800.jpg
```

WebP e AVIF ficam para quando houver uma ferramenta que os gere (o `sips` daqui não escreve WebP). `assets/DIRECAO-DE-ARTE.md` lista, por bloco, o arquivo usado e a alternativa. Toda imagem gerada por IA leva a legenda "imagem conceitual".

## Figuras isométricas

As figuras (casa, caminhão, amostras, símbolo da abertura) são SVG gerado em `figures/out/figures.js`. Para regenerar:

```bash
node site/figures/build.mjs
```

O script lê o símbolo versionado em `assets/logo/alencar-simbolo-terracota-transparente.svg`. As capturas de verificação por largura estão em `docs/capturas-site/` (`360`, `390`, `768`, `1280`, `1440` e as da seção Fábrica).

## Verificação feita

Sem rolagem horizontal de 280 a 1440 px, botões com pelo menos 48 px, links secundários e de navegação com área de toque de 44 px, rótulos do mapa entre 12 e 15 px efetivos, foco visível (`:focus-visible`), `prefers-reduced-motion` respeitado.
