# Security Hardening PR Checklist

## Cambios principales
- Hardening Electron: BrowserWindow, navegación, validación de URLs, webRequest
- API mínima en preload.js con contextBridge
- CSP en index.html, sin scripts inline
- Sanitización de HTML en metadatos
- eslint-plugin-security y regla CSP
- E2E Playwright: playlist maliciosa, navegación segura
- Scripts npm run lint, test, e2e

## Explicación de settings de seguridad
- **contextIsolation**: Aísla el contexto JS del renderer y preload
- **sandbox**: Refuerza el aislamiento de procesos
- **nodeIntegration: false**: Evita acceso Node.js en renderer
- **webSecurity: true**: Activa políticas de seguridad web
- **enableRemoteModule: false**: Desactiva remote para evitar RCE
- **CSP**: Restringe orígenes de scripts, estilos, imágenes, conexiones
- **Validación de URLs**: Solo http/https permitidos para streams y listas
- **Sanitización HTML**: Evita XSS en metadatos
- **eslint-plugin-security**: Detecta patrones inseguros en JS
- **E2E Playwright**: Verifica que no se navega fuera de la app

## ¿Rompe funcionalidades actuales?
- No, todas las funciones principales siguen operativas.

---
