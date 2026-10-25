# Tosan Database Inspector (cPanel-only)

This is a standalone PHP application. It is not imported by Next.js, is not part of the Cloudflare/OpenNext build, and must be deployed to a separate cPanel subdomain/document root.

## Security requirements

- Keep configuration outside the web root, e.g. /home/tusancni/private/db-inspector-config.php.
- Use a dedicated MySQL account with SELECT-only privileges on the intended database.
- Store only a password_hash() value for the inspector password. Never commit secrets or database exports.
- Configure a strict table/column allowlist. Do not include auth tokens, password hashes, payment secrets, private messages, or sensitive columns.
- Require HTTPS and do not expose the app until the access path and credentials are reviewed.

## Configuration shape

The external PHP config must return an array containing inspector_password_hash, mysql (host, database, username, password, optional charset), and tables. Each table entry must define label, columns, and search_columns. Example structure:

    <?php
    return [
      'inspector_password_hash' => 'GENERATED_PASSWORD_HASH',
      'mysql' => ['host'=>'localhost','database'=>'DB_NAME','username'=>'READ_ONLY_USER','password'=>'SECRET','charset'=>'utf8mb4'],
      'tables' => ['blog_posts'=>['label'=>'مقالات وبلاگ','columns'=>['id','title','slug','status','created_at'],'search_columns'=>['title','slug']]],
    ];

Generate the hash in a trusted PHP environment with password_hash('a-long-unique-password', PASSWORD_DEFAULT). Do not store plaintext password or hash in this repository. Verify real schema before adding allowlist columns.

Set TUSAN_DB_INSPECTOR_CONFIG to the absolute config path if supported by hosting. Otherwise adjust the default path in index.php to point outside the web root.

## Isolation and current scope

Deploy only this directory to a separate cPanel subdomain, for example db-inspector.tusancn.ir. Do not put it inside the Next.js app directory or import it into Cloudflare/OpenNext. Initial scope: password-gated access, allowlisted table selection, pagination, parameterized text search. No insert/update/delete/schema mutation exists. The app does not connect to Supabase and does not migrate or modify data.