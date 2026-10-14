-- Etape A (preparation) : bucket prive pour les medias d'entree Motion / Genjutsu.
-- NE PAS EXECUTER sans autorisation. N'affecte pas le bucket "avatars".
-- Restauration : DROP des policies ci-dessous puis suppression du bucket vide.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'motion-inputs',
  'motion-inputs',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lecture : uniquement le proprietaire, dans son dossier "{auth.uid()}/...".
-- Aucune policy pour "anon" : ni lecture ni liste publique.
-- Ecriture : aucune policy client. Les uploads passent par le service_role ou
-- par des URLs d'upload signees generees cote serveur.
drop policy if exists "motion_inputs_owner_select" on storage.objects;
create policy "motion_inputs_owner_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'motion-inputs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
