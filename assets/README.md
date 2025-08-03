# Assets Directory

Este directorio contiene los recursos necesarios para la aplicación Electron:

## Iconos requeridos:
- `icon.png` - Icono para Linux (512x512 px)
- `icon.ico` - Icono para Windows (256x256 px)
- `icon.icns` - Icono para macOS (512x512 px)

## Cómo generar los iconos:

1. Crea un icono base de 512x512 px en formato PNG
2. Usa herramientas como:
   - **electron-icon-builder**: `npm install -g electron-icon-builder`
   - **Online converters**: Para convertir PNG a ICO/ICNS
   - **macOS**: `iconutil` para crear ICNS
   - **Windows**: Herramientas como IcoFX

## Comando para generar automáticamente:
```bash
# Si tienes un icon.png de 512x512
electron-icon-builder --input=./icon.png --output=./assets --flatten
```

Por ahora, la aplicación funcionará sin iconos, pero se recomienda agregarlos para una mejor experiencia de usuario.