#!/usr/bin/env bash
# Publica só a pasta site/ no repositório público; o GitHub Actions (site/.github/workflows/docker.yml) constrói a imagem.
set -euo pipefail
cd "$(dirname "$0")/../.."                    # raiz do repositório local (completo, privado)
SPLIT=$(git subtree split --prefix=site HEAD 2>/dev/null | grep -oE "[0-9a-f]{40}" | tail -n1)
git push --force origin "${SPLIT}:refs/heads/main"
echo "enviado: github.com/felip2ee/ceramica-alencar (só site/); a imagem sai em Actions"
