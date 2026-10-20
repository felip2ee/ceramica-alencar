# Site Cerâmicas Alencar

Página única, estática, sem build: HTML, CSS e JavaScript com módulos ES. GSAP vem do cdnjs. Node 20+ só para os testes e para regenerar as figuras.

## Servir

```bash
npx serve site            # abre em http://localhost:3000
npm test                  # node --test site/tests/
```

## Rever a abertura

A abertura (plaquetas assentando na forma da logo) roda uma vez por navegador e guarda `alencar:abertura=1` no `localStorage`. Para vê-la de novo: `http://localhost:3000/?abertura=1`. Com `prefers-reduced-motion: reduce` ela não roda. Um pequeno script no `<head>` só evita o flash do marfim para quem já viu a abertura; a regra de verdade é `deveRodarAbertura` em `lib/abertura.mjs`.

## Placeholders a trocar

```bash
grep -rn "WHATSAPP_NUMERO\|TOM_.*_NOME\|INSTAGRAM_HANDLE\|RAZAO_SOCIAL\|CNPJ\|SITE_DOMINIO" site/index.html site/main.js
```

| Placeholder | Onde | O que colocar |
| --- | --- | --- |
| `WHATSAPP_NUMERO` | `data-whatsapp` no `<body>` e texto do rodapé | `+55 63 9xxxx-xxxx`. Número que já começa com 55 é tratado como se trouxesse o DDI; sem 55, o código acrescenta. Enquanto for o placeholder, todos os CTAs apontam para `#contato`. |
| `TOM_CLARO_NOME`, `TOM_MEDIO_NOME`, `TOM_ESCURO_NOME` | Revestimentos | nome comercial de cada tom |
| `INSTAGRAM_HANDLE` | rodapé | `@perfil` |
| `RAZAO_SOCIAL`, `CNPJ` | rodapé | dados da empresa |
| `SITE_DOMINIO` | `og:image` no `<head>` | domínio final, sem protocolo (`https://SITE_DOMINIO/assets/logo/favicon-512.png`) |

Palavra "amostra" no texto visível só entra depois de confirmada com a Cerâmicas Alencar. A classe `.amostra` dos cartões de tom é nome interno e não aparece para o visitante.

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

O script lê o kit da logo em `Ceramica_Alencar_Kit_Web/`, que não é versionado: o `figures.js` commitado é a fonte da verdade. As capturas de verificação por largura estão em `figures/shots/` (`360`, `390`, `768`, `1280`, `1440` e as da seção Fábrica).

## Verificação feita

Sem rolagem horizontal de 280 a 1440 px, botões e filtros com pelo menos 48 px, links secundários e de navegação com área de toque de 44 px, rótulos do mapa entre 12 e 15 px efetivos, foco visível (`:focus-visible`), `prefers-reduced-motion` respeitado.
