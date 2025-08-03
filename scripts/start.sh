#!/bin/bash

# Script de inicio para M3U Player Electron
echo "🎬 Iniciando M3U Player Electron..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js primero."
    echo "   Descarga desde: https://nodejs.org/"
    exit 1
fi

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado. Por favor instala npm primero."
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar si la instalación fue exitosa
if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias. Verifica tu conexión a internet."
    exit 1
fi

echo "✅ Dependencias instaladas correctamente"
echo "🚀 Iniciando aplicación..."

# Iniciar la aplicación
npm start