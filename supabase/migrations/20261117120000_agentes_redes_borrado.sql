-- Las piezas propias de agentes pueden eliminarse mientras sean borradores sin envíos
-- (agent_delete_social_custom_post lo valida). Sin este permiso la función fallaba para service_role.
grant delete on public.social_custom_posts to service_role;
