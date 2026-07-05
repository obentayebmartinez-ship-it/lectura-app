# Política de seudonimización, conservación y supresión — LectorIA

Documento interno de referencia para el responsable del tratamiento (Omar Bentayeb Martínez).
Desarrolla lo que promete `consentimiento-informado-lectoria.pdf` en los apartados 5 (protección
de datos), 6 (conservación) y 7 (derechos). No se entrega a las familias; es la "letra pequeña
técnica" que respalda ese documento.

## 1. Qué está seudonimizado hoy, por diseño

El esquema (`recrear-base-datos.sql`) separa dos tipos de dato:

- **Identificación real** (nombre del menor): vive en dos sitios, `alumnos.nombre` y
  `sesiones.alumno_nombre`. Existe porque el docente necesita saber a qué niño concreto
  corresponde cada sesión — es imprescindible para el uso diario de la herramienta.
- **El material de trabajo lector** (audio + análisis palabra a palabra): vive en
  `sesion_palabras` y en los archivos del bucket `audios`. **Ninguno de los dos contiene el
  nombre del menor.** El audio se guarda como `audios/{user_id}/{sesion_id}.webm` — un UUID de
  sesión, no un nombre — y `sesion_palabras` solo referencia `sesion_id`.

Esto significa que **el dato sensible (voz + errores de lectura) ya nace seudonimizado**: el
`alumno_id`/`sesion_id` (UUID aleatorio) hace de código, y la única tabla que permite volver
del código al nombre real es `alumnos`, protegida por RLS (solo el `user_id` dueño la puede leer).
Esa tabla `alumnos` **es** la clave de reidentificación de la que habla el consentimiento firmado.

## 2. Regla de oro al exportar datos para entrenar el modelo propio

Cuando llegue la fase de preparar el dataset de entrenamiento (fase 4 de la hoja de ruta), la
consulta de exportación **no debe tocar** estas columnas bajo ningún concepto:

- `alumnos.nombre`
- `sesiones.alumno_nombre`

Basta con exportar `sesion_palabras` (join con `sesiones` solo para `curso`, `texto_id`, `ppm`,
etc., nunca `alumno_nombre`) más los archivos de audio. El resultado es un dataset donde cada
muestra está identificada por un UUID sin ningún significado fuera de esta base de datos.

## 3. Conservación

Mientras el menor participe activamente, los datos se conservan sin plazo fijo (son la base del
seguimiento de su progreso lector). No hay borrado automático por antigüedad todavía — es una
decisión pendiente de revisar cuando haya más volumen, pero no bloquea el piloto actual.

## 4. Derecho de supresión — procedimiento real (⚠️ hueco detectado y cómo cerrarlo)

**El hueco:** `sesiones` y `sesion_palabras` tienen `on delete cascade` hacia `alumnos`, así que
borrar un alumno borra sus filas de BD automáticamente. **Pero los archivos de audio en el bucket
`audios` NO están enlazados por clave foránea — Supabase Storage es un sistema aparte.** Si hoy
borras un alumno, sus grabaciones de voz se quedan huérfanas en el bucket para siempre. Eso
incumple el derecho de supresión que promete el consentimiento firmado.

**Procedimiento a seguir cuando una familia pida la baja** (hasta que se automatice):

1. Averiguar las rutas de audio del alumno **antes** de borrar nada:

   ```sql
   select audio_path from sesiones
   where alumno_id = '<uuid-del-alumno>' and audio_path is not null;
   ```

2. Borrar esos archivos del bucket. Desde la consola del navegador logueado en la app (o añadiendo
   un botón de administración más adelante), con el cliente ya autenticado:

   ```js
   const rutas = [/* pegar aquí las audio_path del paso 1 */];
   await sb.storage.from("audios").remove(rutas);
   ```

   (La política `audios_delete` ya permite esto: el dueño de la carpeta `{user_id}/` puede borrar
   sus propios archivos — no hace falta tocar RLS.)

3. Solo entonces borrar el alumno; el cascade se encarga del resto:

   ```sql
   delete from alumnos where id = '<uuid-del-alumno>';
   ```

**Pendiente de automatizar** (no urgente al volumen actual, pero anotado para la fase de panel de
administración): un botón "Eliminar alumno y sus audios" en `panel.html` que haga los 3 pasos de
un clic, o una Edge Function con `service_role` que borre en cascada de verdad. Mientras el
volumen de bajas sea bajo (piloto con conocidos), el procedimiento manual de arriba es seguro y
suficiente.

## 5. Resumen para consulta rápida

| Pregunta | Respuesta |
|---|---|
| ¿Dónde está el nombre real? | `alumnos.nombre`, `sesiones.alumno_nombre` — protegidos por RLS |
| ¿Dónde está la "clave" para reidentificar? | La tabla `alumnos` en sí misma |
| ¿El audio y el detalle de palabras llevan nombre? | No, solo UUIDs |
| ¿Qué NUNCA se exporta para entrenar el modelo? | `nombre`, `alumno_nombre` |
| ¿Borrar un alumno borra su audio? | **No automáticamente** — seguir el procedimiento de la sección 4 |
