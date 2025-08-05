# Requisitos del EPG (Electronic Program Guide)

## Introducción

Esta funcionalidad añadirá un sistema de guía electrónica de programas (EPG) al reproductor M3U existente, permitiendo a los usuarios ver información detallada sobre la programación actual y futura de los canales IPTV. El EPG proporcionará una experiencia más rica y profesional, similar a la de los reproductores de televisión tradicionales.

## Requisitos

### Requisito 1

**Historia de Usuario:** Como usuario del reproductor M3U, quiero ver la programación actual y futura de los canales IPTV, para poder saber qué contenido está disponible y planificar mi visualización.

#### Criterios de Aceptación

1. CUANDO el usuario seleccione un canal THEN el sistema DEBERÁ mostrar la información del programa actual si está disponible
2. CUANDO el usuario acceda al EPG THEN el sistema DEBERÁ mostrar una grilla de programación con al menos 24 horas de contenido futuro
3. CUANDO no haya información de EPG disponible THEN el sistema DEBERÁ mostrar un mensaje informativo apropiado
4. CUANDO el sistema cargue datos de EPG THEN DEBERÁ actualizar automáticamente la información cada 30 minutos

### Requisito 2

**Historia de Usuario:** Como usuario, quiero poder navegar fácilmente por la programación de diferentes canales y horarios, para encontrar rápidamente el contenido que me interesa.

#### Criterios de Aceptación

1. CUANDO el usuario abra el EPG THEN el sistema DEBERÁ mostrar una interfaz de grilla con canales en filas y horarios en columnas
2. CUANDO el usuario haga clic en un programa THEN el sistema DEBERÁ mostrar información detallada del programa (título, descripción, duración, género)
3. CUANDO el usuario navegue por la grilla THEN el sistema DEBERÁ permitir desplazamiento horizontal por tiempo y vertical por canales
4. CUANDO el usuario seleccione un programa futuro THEN el sistema DEBERÁ ofrecer la opción de configurar un recordatorio

### Requisito 3

**Historia de Usuario:** Como usuario, quiero que el EPG se integre perfectamente con la interfaz existente del reproductor, para mantener una experiencia de usuario consistente.

#### Criterios de Aceptación

1. CUANDO el usuario acceda al EPG THEN el sistema DEBERÁ mantener el tema visual oscuro y profesional existente
2. CUANDO el EPG esté abierto THEN el sistema DEBERÁ permitir cambiar de canal directamente desde la grilla
3. CUANDO el usuario cierre el EPG THEN el sistema DEBERÁ volver a la vista del reproductor sin interrumpir la reproducción
4. CUANDO el EPG esté visible THEN el sistema DEBERÁ mostrar un indicador visual del programa actualmente en reproducción

### Requisito 4

**Historia de Usuario:** Como usuario, quiero que el sistema obtenga automáticamente los datos de EPG de fuentes confiables, para tener información actualizada sin configuración manual.

#### Criterios de Aceptación

1. CUANDO el sistema cargue una playlist M3U THEN DEBERÁ intentar obtener datos de EPG automáticamente usando los identificadores de canal
2. CUANDO los datos de EPG estén disponibles THEN el sistema DEBERÁ cachearlos localmente para mejorar el rendimiento
3. CUANDO el sistema no pueda obtener datos de EPG THEN DEBERÁ continuar funcionando normalmente sin afectar la reproducción
4. CUANDO haya múltiples fuentes de EPG disponibles THEN el sistema DEBERÁ priorizar las fuentes más confiables y actualizadas

### Requisito 5

**Historia de Usuario:** Como usuario, quiero poder buscar programas específicos en el EPG, para encontrar rápidamente el contenido que me interesa sin navegar manualmente.

#### Criterios de Aceptación

1. CUANDO el usuario ingrese texto en la búsqueda del EPG THEN el sistema DEBERÁ filtrar los programas que coincidan con el título o descripción
2. CUANDO el usuario seleccione un resultado de búsqueda THEN el sistema DEBERÁ navegar automáticamente al canal y horario correspondiente
3. CUANDO no haya resultados de búsqueda THEN el sistema DEBERÁ mostrar un mensaje informativo apropiado
4. CUANDO el usuario borre la búsqueda THEN el sistema DEBERÁ volver a mostrar la grilla completa del EPG

### Requisito 6

**Historia de Usuario:** Como usuario, quiero poder configurar recordatorios para programas futuros, para no perder el contenido que me interesa.

#### Criterios de Aceptación

1. CUANDO el usuario seleccione un programa futuro THEN el sistema DEBERÁ ofrecer la opción de crear un recordatorio
2. CUANDO se acerque la hora de un programa con recordatorio THEN el sistema DEBERÁ mostrar una notificación
3. CUANDO el usuario confirme un recordatorio THEN el sistema DEBERÁ cambiar automáticamente al canal correspondiente
4. CUANDO el usuario tenga recordatorios activos THEN el sistema DEBERÁ mostrar una lista de recordatorios pendientes

### Requisito 7

**Historia de Usuario:** Como usuario, quiero que el EPG funcione tanto en modo online como offline, para tener acceso a la información de programación incluso con conectividad limitada.

#### Criterios de Aceptación

1. CUANDO el sistema esté online THEN DEBERÁ descargar y actualizar automáticamente los datos de EPG
2. CUANDO el sistema esté offline THEN DEBERÁ usar los datos de EPG cacheados localmente
3. CUANDO los datos cacheados estén desactualizados THEN el sistema DEBERÁ mostrar un indicador de la fecha de última actualización
4. CUANDO se restablezca la conexión THEN el sistema DEBERÁ sincronizar automáticamente los datos de EPG