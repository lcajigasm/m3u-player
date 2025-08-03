#!/bin/bash

# Script para desarrollo con recarga automática
echo "🔄 Iniciando M3U Player en modo desarrollo con recarga forzada..."

# Limpiar caché de npm si existe
if [ -d "node_modules/.cache" ]; then
    echo "🧹 Limpiando caché de node_modules..."
    rm -rf node_modules/.cache
fi

# Agregar timestamp a archivos para evitar caché
TIMESTAMP=$(date +%s)
echo "⏰ Timestamp: $TIMESTAMP"

# Actualizar versiones en package.json
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"1.1.$TIMESTAMP\"/" package.json

echo "🚀 Iniciando aplicación..."
npm run dev

# Restaurar package.json original
if [ -f "package.json.bak" ]; then
    mv package.json.bak package.json
fi