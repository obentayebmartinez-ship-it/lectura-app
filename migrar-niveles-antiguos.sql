-- ============================================================================
-- LectorIA — migrar-niveles-antiguos.sql  ·  EJECUTAR UNA SOLA VEZ
--
-- Qué corrige: hasta el 5 de julio de 2026 (commit 6266a4e, 23:05) los niveles
-- de la hoja de registro usaban DOS escalas: en velocidad/pausas/comprensión
-- 3 era lo mejor, pero en los errores 3 era lo PEOR (mucha dificultad). Desde
-- entonces la escala está unificada: 3 = "En nivel" (mejor) en TODAS.
--
-- Las sesiones verificadas ANTES de ese momento guardan los niveles de error
-- con la escala vieja. Este script los invierte (nuevo = 4 - viejo) SOLO en
-- las claves de dificultad; velocidad, pausas_entonacion y comprensión ya
-- estaban bien y NO se tocan.
--
-- ⚠⚠ MUY IMPORTANTE ⚠⚠
--  1. Ejecutar UNA SOLA VEZ. Si se ejecuta dos veces, deshace la corrección.
--  2. PRIMERO ejecuta el PASO 1 (solo consulta) y revisa la lista: deben ser
--     únicamente sesiones que verificaste antes del 5 de julio por la noche.
--     OJO: `fecha` es la fecha de LECTURA, no de verificación. Si alguna
--     lectura anterior al día 5 la verificaste DESPUÉS del cambio, apúntala
--     y exclúyela añadiendo:  and id not in ('<uuid1>', '<uuid2>')
--  3. Si el PASO 1 no devuelve ninguna fila, no hay nada que migrar: no
--     ejecutes el PASO 2 y borra este archivo.
-- ============================================================================

-- ── PASO 1 · VISTA PREVIA (solo consulta, no cambia nada) ────────────────────
select id, alumno_nombre, texto_titulo, fecha, niveles
from sesiones
where estado = 'verificada'
  and niveles is not null
  and niveles <> '{}'::jsonb
  and fecha < '2026-07-05T21:00:00Z'   -- 23:00 hora peninsular española (CEST)
order by fecha;

-- ── PASO 2 · MIGRACIÓN (ejecutar solo tras revisar el paso 1) ────────────────
-- Invierte (4 - valor) las claves de DIFICULTAD; el resto queda igual.
/*
update sesiones
set niveles = (
  select jsonb_object_agg(
    clave,
    case
      when clave in ('silabeo','vacilacion','rectificacion','repeticion',
                     'sustitucion','omisiones','inversion','adicion','rotacion')
           and jsonb_typeof(valor) = 'number'
      then to_jsonb(4 - (valor #>> '{}')::int)
      else valor
    end)
  from jsonb_each(niveles) as t(clave, valor)
)
where estado = 'verificada'
  and niveles is not null
  and niveles <> '{}'::jsonb
  and fecha < '2026-07-05T21:00:00Z';
*/

-- ── PASO 3 · COMPROBACIÓN ────────────────────────────────────────────────────
-- Vuelve a ejecutar el PASO 1: en las sesiones migradas, un alumno con POCOS
-- errores debe tener ahora 3 ("En nivel") en esas claves, no 1.
