-- RUN THIS ONCE IN SUPABASE SQL EDITOR IF LOVABLE HAS NOT APPLIED THE NEW MIGRATION.
-- It backfills the owner/admin role for accounts that existed before the schema was installed.

INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
ORDER BY u.created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

SELECT p.email, r.role
FROM public.profiles p
JOIN public.user_roles r ON r.user_id = p.id
ORDER BY p.created_at;
