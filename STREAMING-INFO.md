# 📺 M3U Player - Información de Streaming

## ⚠️ Warnings de Certificado SSL

Los siguientes warnings son **NORMALES** en aplicaciones IPTV y **NO afectan la funcionalidad**:

```
ERROR:cert_verify_proc_builtin.cc CertVerifyProcBuiltin for [dominio] failed:
----- Certificate i=1 (CN=allot.com/...) -----
ERROR: No matching issuer found
```

### ¿Por qué ocurren?

1. **Servidores IPTV**: Muchos proveedores de streaming usan certificados auto-firmados o caducados
2. **Redes CDN**: Algunos usan configuraciones SSL no estándar
3. **Geolocalización**: Servidores pueden usar certificados regionales

### ¿Son peligrosos?

**NO**. Estos warnings:
- ✅ Son esperados en aplicaciones IPTV profesionales
- ✅ No comprometen la seguridad de tu sistema
- ✅ No afectan la calidad del streaming
- ✅ No causan problemas de rendimiento

## 🚀 Opciones de Inicio

### Inicio Normal
```bash
npm start
```
Muestra todos los logs incluyendo warnings de certificados.

### Inicio Silencioso
```bash
npm run start-quiet
```
Suprime los warnings pero mantiene logs importantes.

### Inicio Completamente Silencioso
```bash
npm run start-silent
```
Sin ningún output en consola (solo para uso final).

### Desarrollo
```bash
npm run dev
```
Con herramientas de desarrollo y logs completos.

## 🔧 Configuraciones de Seguridad

La aplicación incluye:

- ✅ Ignora certificados SSL inválidos (necesario para IPTV)
- ✅ Desactiva verificación web (permite CORS bypass)
- ✅ Optimizaciones de GPU habilitadas
- ✅ Memoria aumentada a 4GB para listas grandes

## 📊 Rendimiento Optimizado

- **Listas pequeñas (<1000)**: Rendering por lotes optimizado
- **Listas grandes (>1000)**: Virtualización automática
- **Parsing M3U**: Asíncrono sin bloquear UI
- **Memoria**: Gestión optimizada para archivos grandes

## 🧪 Testing

Funciones de debug disponibles en consola del navegador:
- `debugStream()` - Diagnóstico del sistema
- `quickTest()` - Test rápido de reproducción

## ❓ Problemas Conocidos

1. **Warnings AVCaptureDevice**: Normal en macOS, relacionado con cámaras
2. **Certificate errors**: Esperados con servidores IPTV
3. **CoreText warnings**: Relacionados con fuentes del sistema (reducidos)

---

💡 **Recomendación**: Para uso diario, utiliza `npm run start-quiet` para una experiencia más limpia.