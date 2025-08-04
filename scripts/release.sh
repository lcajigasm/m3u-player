#!/bin/bash

# Script para crear un nuevo release
# Uso: ./scripts/release.sh <version>
# Ejemplo: ./scripts/release.sh 1.0.0

set -e

if [ -z "$1" ]; then
    echo "Error: Debes proporcionar una versión"
    echo "Uso: $0 <version>"
    echo "Ejemplo: $0 1.0.0"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo "🚀 Creando release $TAG..."

# Verificar que estemos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Advertencia: No estás en la rama main (actual: $CURRENT_BRANCH)"
    read -p "¿Continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar que no hay cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: Hay cambios sin commitear"
    echo "Por favor, commitea todos los cambios antes de crear un release"
    exit 1
fi

# Actualizar package.json con la nueva versión
echo "📝 Actualizando package.json..."
npm version $VERSION --no-git-tag-version

# Commitear el cambio de versión
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"

# Crear y pushear el tag
echo "🏷️  Creando tag $TAG..."
git tag $TAG
git push origin main
git push origin $TAG

echo "✅ Release $TAG creado exitosamente!"
echo "🔗 Ve a GitHub Actions para ver el progreso de la construcción:"
echo "   https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')/actions"