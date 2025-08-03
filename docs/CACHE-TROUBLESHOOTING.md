# 🔄 Solución de Problemas de Caché

## Problema: Los cambios no se reflejan en la aplicación

### ✅ Soluciones implementadas:

#### 1. **Botón de recarga forzada**
- Usa el botón "🔄 Actualizar" en la interfaz principal
- Fuerza una recarga completa sin caché

#### 2. **Atajos de teclado**
- **Ctrl+R** (Cmd+R en Mac) - Recarga normal
- **Ctrl+Shift+R** (Cmd+Shift+R en Mac) - Recarga sin caché
- **F5** - Recarga normal

#### 3. **Menú de Electron**
- **Ver → Recarga forzada (sin caché)**
- **Ver → Limpiar caché**

#### 4. **Scripts de desarrollo**
```bash
# Desarrollo sin caché
npm run dev-nocache

# Limpiar caché y ejecutar
npm run clear-cache

# Script personalizado
./dev-reload.sh
```

#### 5. **Soluciones manuales**

##### En Electron:
1. Abrir DevTools (F12)
2. Clic derecho en el botón de recarga
3. Seleccionar "Empty Cache and Hard Reload"

##### En navegador web:
1. **Chrome/Edge**: Ctrl+Shift+Delete → Limpiar datos
2. **Firefox**: Ctrl+Shift+Delete → Limpiar caché
3. **Safari**: Cmd+Option+E → Vaciar cachés

#### 6. **Verificaciones técnicas**

##### Archivos con versionado:
- `styles.css?v=1.1.0`
- `script.js?v=1.1.0`

##### Meta tags anti-caché:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
```

##### Configuración Electron:
```javascript
webPreferences: {
  cache: false // Desactivar caché para desarrollo
}
```

### 🚨 Si nada funciona:

#### Solución nuclear:
```bash
# Eliminar todo y reinstalar
rm -rf node_modules
rm package-lock.json
npm install
npm run dev-nocache
```

#### Verificar archivos:
```bash
# Ver timestamps de archivos
ls -la *.css *.js *.html

# Verificar que los cambios están guardados
git status
```

### 📊 Logs de debugging:

La aplicación incluye logs para verificar la carga:
```
🔄 Estilos actualizados para evitar caché
🎬 Iniciando reproductor M3U...
📱 Plataforma: Electron
```

### 💡 Prevención:

1. **Usar modo desarrollo**: `npm run dev`
2. **Mantener DevTools abierto** durante desarrollo
3. **Usar versionado** en archivos estáticos
4. **Verificar cambios** en el código antes de probar

### 🔍 Diagnóstico:

Si los cambios siguen sin aparecer:

1. **Verificar consola** (F12) para errores
2. **Comprobar Network tab** para ver si se cargan archivos nuevos
3. **Revisar timestamps** en las URLs de recursos
4. **Confirmar que los archivos** están guardados correctamente

---

**Nota**: En producción, la caché está habilitada para mejor rendimiento. Estos problemas solo afectan al desarrollo.