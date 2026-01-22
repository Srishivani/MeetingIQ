-- Fix function search path mutable issue
ALTER FUNCTION public.update_updated_at() SET search_path = public;