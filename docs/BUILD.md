# Guía de Construcción y Distribución

## GitHub Actions

Este proyecto incluye dos workflows de GitHub Actions para automatizar la construcción de ejecutables:

### 1. Workflow de CI (`ci.yml`)
- Se ejecuta en cada push a `main` o `develop`
- Ejecuta en Ubuntu, Windows y macOS
- Realiza una construcción de prueba sin generar artefactos

### 2. Workflow de Build y Release (`build.yml`)
- Se ejecuta cuando:
  - Se crea un tag que comience con `v` (ej: `v1.0.0`)
  - Se ejecuta manualmente desde GitHub Actions
  - En pull requests hacia `main`
- Genera ejecutables para todas las plataformas
- Crea automáticamente un release en GitHub cuando se usa un tag

## Formatos de Salida

### Windows
- `.exe` - Instalador NSIS
- Portable ejecutable

### macOS
- `.dmg` - Imagen de disco
- `.zip` - Archivo comprimido
- Soporte para arquitecturas x64 y ARM64 (Apple Silicon)

### Linux
- `.AppImage` - Ejecutable portable
- `.deb` - Paquete Debian/Ubuntu
- `.rpm` - Paquete Red Hat/Fedora

## Cómo Crear un Release

1. **Crear un tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **El workflow automáticamente:**
   - Construirá para todas las plataformas
   - Creará un release en GitHub
   - Subirá todos los ejecutables como assets del release

## Construcción Local

Para construir localmente:

```bash
# Instalar dependencias
npm install

# Construir para la plataforma actual
npm run dist

# Solo empaquetar (más rápido para pruebas)
npm run pack
```

## Iconos de Aplicación

Para agregar iconos personalizados, coloca los siguientes archivos en la carpeta `assets/`:

- `icon.icns` - Para macOS (512x512 px)
- `icon.ico` - Para Windows (256x256 px)
- `icon.png` - Para Linux (512x512 px)

Luego actualiza el `package.json` en la sección `build` para incluir las rutas de los iconos.

## Configuración Avanzada

### Variables de Entorno
- `GH_TOKEN` - Token de GitHub (se configura automáticamente)
- `CSC_LINK` - Certificado de firma de código (opcional)
- `CSC_KEY_PASSWORD` - Contraseña del certificado (opcional)

### Personalización
Puedes modificar los workflows en `.github/workflows/` para:
- Cambiar las plataformas objetivo
- Agregar pasos de testing
- Modificar los formatos de salida
- Agregar notificaciones

## Solución de Problemas

### Error de permisos en macOS
Si encuentras errores de permisos en macOS, asegúrate de que el repositorio tenga configurado correctamente el token de GitHub.

### Builds fallidos
1. Revisa los logs en la pestaña "Actions" de GitHub
2. Verifica que todas las dependencias estén en `package.json`
3. Asegúrate de que los archivos referenciados en `build.files` existan

### Tamaño de artefactos
Los ejecutables pueden ser grandes debido a que incluyen el runtime de Electron. Esto es normal para aplicaciones Electron.