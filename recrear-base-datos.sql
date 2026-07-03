-- ============================================================================
-- LectorIA — recrear-base-datos.sql (esquema v2 · julio 2026)
--
-- Ejecutar COMPLETO en el SQL Editor del proyecto NUEVO de Supabase.
-- Es idempotente: se puede reejecutar sin duplicar nada.
--
-- Novedades v2 respecto a la BD perdida:
--   · Todo tiene dueño (user_id) y RLS activado: cada docente ve SOLO lo suyo.
--   · sesiones ligadas a un alumno real (alumno_id), no a un nombre suelto.
--   · audio_path: el audio completo de la lectura se guarda en Storage.
--   · sesion_palabras: detalle palabra a palabra (el dataset para verificar
--     y, en el futuro, entrenar el modelo propio).
--   · niveles (jsonb) + estado: la "hoja de registro" verificada por el docente.
--   · Se elimina la columna silabeo (el motor ya no lo mide; queda como
--     campo manual dentro de niveles).
-- ============================================================================

-- ── 1. Tablas ───────────────────────────────────────────────────────────────

create table if not exists alumnos (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  nombre               text not null,
  curso                text not null check (curso in ('1P','2P','3P','4P','5P','6P')),
  consentimiento_audio boolean not null default false,
  creado               timestamptz not null default now()
);

create table if not exists sesiones (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  alumno_id         uuid not null references alumnos(id) on delete cascade,
  alumno_nombre     text not null,
  texto_id          text not null,
  texto_titulo      text,
  curso             text,
  ppm               int,
  "precision"       int,
  fluency           int,
  prosody           int,
  omisiones         int default 0,
  sustituciones     int default 0,
  adiciones         int default 0,
  inversiones       int default 0,
  repeticiones      int default 0,
  rectificaciones   int default 0,
  vacilaciones      int default 0,
  pausas_largas     int default 0,
  duracion_segundos int,
  audio_path        text,
  estado            text not null default 'analizada' check (estado in ('analizada','verificada')),
  niveles           jsonb,
  fecha             timestamptz not null default now()
);

-- Detalle palabra a palabra: lo que propuso la IA (tipo_ia) y lo que confirmó
-- o corrigió el docente (tipo_verificado). Las filas se guardan en el orden
-- del alineamiento: ordenar por id reproduce la lectura completa.
create table if not exists sesion_palabras (
  id              bigint generated always as identity primary key,
  sesion_id       uuid not null references sesiones(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  idx             int not null,          -- índice en el texto de referencia (-1 = palabra añadida)
  palabra_ref     text,                  -- palabra del texto (null en adiciones)
  palabra_dicha   text,                  -- palabra reconocida (null en omisiones)
  tipo_ia         text not null,         -- correcta|omision|omision_dudosa|no_leida|sustitucion|inversion|adicion|repeticion|rectificacion|vacilacion
  tipo_verificado text,                  -- null hasta que el docente verifique
  accuracy        int,                   -- AccuracyScore de Azure (0-100)
  offset_ms       int,                   -- inicio de la palabra en el audio
  duracion_ms     int,
  gap_ms          int                    -- silencio antes de la palabra
);

create index if not exists sesiones_user_fecha_idx  on sesiones (user_id, fecha);
create index if not exists sesiones_alumno_idx      on sesiones (alumno_id, fecha);
create index if not exists palabras_sesion_idx      on sesion_palabras (sesion_id, id);

-- ── 2. Row Level Security: cada docente solo ve lo suyo ─────────────────────

alter table alumnos         enable row level security;
alter table sesiones        enable row level security;
alter table sesion_palabras enable row level security;

drop policy if exists alumnos_select on alumnos;
drop policy if exists alumnos_insert on alumnos;
drop policy if exists alumnos_update on alumnos;
drop policy if exists alumnos_delete on alumnos;
create policy alumnos_select on alumnos for select to authenticated using (auth.uid() = user_id);
create policy alumnos_insert on alumnos for insert to authenticated with check (auth.uid() = user_id);
create policy alumnos_update on alumnos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy alumnos_delete on alumnos for delete to authenticated using (auth.uid() = user_id);

drop policy if exists sesiones_select on sesiones;
drop policy if exists sesiones_insert on sesiones;
drop policy if exists sesiones_update on sesiones;
drop policy if exists sesiones_delete on sesiones;
create policy sesiones_select on sesiones for select to authenticated using (auth.uid() = user_id);
create policy sesiones_insert on sesiones for insert to authenticated with check (auth.uid() = user_id);
create policy sesiones_update on sesiones for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sesiones_delete on sesiones for delete to authenticated using (auth.uid() = user_id);

drop policy if exists palabras_select on sesion_palabras;
drop policy if exists palabras_insert on sesion_palabras;
drop policy if exists palabras_update on sesion_palabras;
drop policy if exists palabras_delete on sesion_palabras;
create policy palabras_select on sesion_palabras for select to authenticated using (auth.uid() = user_id);
create policy palabras_insert on sesion_palabras for insert to authenticated with check (auth.uid() = user_id);
create policy palabras_update on sesion_palabras for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy palabras_delete on sesion_palabras for delete to authenticated using (auth.uid() = user_id);

-- ── 3. Bucket privado de audios ──────────────────────────────────────────────
-- Los audios se guardan en audios/{user_id}/{sesion_id}.webm
-- Solo el dueño de la carpeta puede leer/escribir; se accede con URLs firmadas.

insert into storage.buckets (id, name, public)
values ('audios', 'audios', false)
on conflict (id) do nothing;

drop policy if exists audios_insert on storage.objects;
drop policy if exists audios_select on storage.objects;
drop policy if exists audios_delete on storage.objects;
create policy audios_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);
create policy audios_select on storage.objects for select to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);
create policy audios_delete on storage.objects for delete to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 4. Comprobación rápida (opcional) ────────────────────────────────────────
-- select table_name from information_schema.tables
--  where table_schema = 'public'
--    and table_name in ('alumnos','sesiones','sesion_palabras');
