# Notification audit

The current database already contains `public.notifications` as the central in-app notification store. It has recipient, type, title, message, optional order relation, metadata, created_at, and read_at fields, with RLS enabled.

This audit prevents duplicate implementation of a feature that already exists in the database. The next implementation step should integrate the existing table with the admin UI/API and verify unread/read behavior rather than create another notification table.
