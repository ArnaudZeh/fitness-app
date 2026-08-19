-- Couche IA nutrition — le 3e outil de chat ajuster_objectifs_nutrition
-- (propose-puis-applique, même patron que generer_programme/adapter_seance)
-- doit pouvoir être stocké dans assistant_messages.tool_name comme les deux
-- premiers.
alter table public.assistant_messages
  drop constraint assistant_messages_tool_name_check;

alter table public.assistant_messages
  add constraint assistant_messages_tool_name_check
  check (tool_name in ('generer_programme', 'adapter_seance', 'ajuster_objectifs_nutrition'));
