#!/usr/bin/env bash
# Publica o site: (1) imagem linux/amd64 no ghcr, (2) só a pasta site/ no repositório público.
# Pré-requisito único: gh logado com escopo de pacotes (gh auth refresh -h github.com -s write:packages,read:packages).
set -euo pipefail
cd "$(dirname "$0")/.."                       # site/
IMAGEM=ghcr.io/felip2ee/ceramica-alencar
gh auth token | docker login ghcr.io -u "$(gh api user --jq .login)" --password-stdin
docker buildx build --platform linux/amd64 -t "$IMAGEM:latest" -t "$IMAGEM:$(git rev-parse --short HEAD)" --push .
cd ..                                          # raiz do repositório local (completo, privado)
git push --force origin "$(git subtree split --prefix=site HEAD):refs/heads/main"
echo "publicado: $IMAGEM:latest e github.com/felip2ee/ceramica-alencar (só site/)"
