-- =============================================================================
-- NetCore DG-KOMPUTER — Reset Data Operasional
-- =============================================================================
-- Mengosongkan data kerja tanpa menghapus akun, profil, dan role login.
-- Cocok dipakai sebelum demo ulang atau memindahkan project ke database baru.
-- =============================================================================

DELETE FROM public.activity_logs;
DELETE FROM public.installations;
DELETE FROM public.customers;

-- Jika ingin benar-benar menghapus user aplikasi juga, lakukan dari panel Auth
-- backend terlebih dahulu. Jangan hapus profiles/user_roles manual tanpa memahami
-- dampaknya ke akun login.
