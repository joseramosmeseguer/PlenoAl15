-- Cambia el bloqueo de pronósticos de 24h a 1h antes del partido.
UPDATE public.settings SET value = '1'::jsonb WHERE key = 'lock_hours_before';
