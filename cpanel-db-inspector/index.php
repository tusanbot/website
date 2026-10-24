<?php
declare(strict_types=1);

/* Standalone cPanel-only inspector. No imports from the Next.js/Cloudflare app. */
$configPath = getenv('TUSAN_DB_INSPECTOR_CONFIG');
if (!is_string($configPath) || $configPath === '') $configPath = '/home/tusancni/private/db-inspector-config.php';
if (!is_file($configPath) || !is_readable($configPath)) { http_response_code(503); exit('Inspector configuration is not installed.'); }
$config = require $configPath;
if (!is_array($config) || empty($config['inspector_password_hash']) || empty($config['mysql']) || !is_array($config['mysql']) || empty($config['tables']) || !is_array($config['tables'])) { http_response_code(503); exit('Inspector configuration is incomplete.'); }

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('tusan_db_inspector');
session_set_cookie_params(['lifetime'=>0,'path'=>'/','secure'=>$isHttps,'httponly'=>true,'samesite'=>'Strict']);
ini_set('session.use_strict_mode','1');
session_start();
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, max-age=0');
header("Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
$csrf = (string)$_SESSION['csrf'];
$error = '';
$loggedIn = !empty($_SESSION['inspector_authenticated']);
function h(mixed $value): string {
    if ($value === null) return 'NULL';
    if (is_bool($value)) $value = $value ? 'true' : 'false';
    if (is_array($value) || is_object($value)) $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, (string)($_POST['csrf'] ?? ''))) { http_response_code(403); exit('Invalid request token.'); }
    $action = (string)($_POST['action'] ?? '');
    if ($action === 'login') {
        if (password_verify((string)($_POST['password'] ?? ''), (string)$config['inspector_password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['inspector_authenticated'] = true;
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
            header('Location: ' . strtok((string)($_SERVER['REQUEST_URI'] ?? '/'), '?')); exit;
        }
        usleep(350000);
        $error = 'ورود ناموفق بود.';
    } elseif ($action === 'logout' && $loggedIn) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', ['expires'=>time()-42000,'path'=>$cookie['path'],'secure'=>$cookie['secure'],'httponly'=>true,'samesite'=>'Strict']);
        }
        session_destroy();
        header('Location: ' . strtok((string)($_SERVER['REQUEST_URI'] ?? '/'), '?')); exit;
    }
}
$selectedTable = '';
$rows = [];
$columns = [];
$total = 0;
$page = max(1, min(100000, (int)($_GET['page'] ?? 1)));
$pageSize = 25;
$search = trim((string)($_GET['q'] ?? ''));
if (strlen($search) > 200) $search = substr($search, 0, 200);
$notice = '';
if ($loggedIn && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    $selectedTable = (string)($_GET['table'] ?? '');
    if ($selectedTable !== '' && !array_key_exists($selectedTable, $config['tables'])) {
        http_response_code(400); $notice = 'جدول انتخاب‌شده در فهرست مجاز نیست.'; $selectedTable = '';
    }
    if ($selectedTable !== '') {
        $definition = $config['tables'][$selectedTable];
        $allowedColumns = array_values(array_unique(array_filter(is_array($definition['columns'] ?? null) ? $definition['columns'] : [], static fn($c) => is_string($c) && preg_match('/^[A-Za-z0-9_]+$/', $c))));
        $searchColumns = array_values(array_intersect(is_array($definition['search_columns'] ?? null) ? $definition['search_columns'] : [], $allowedColumns));
        if (!$allowedColumns) $notice = 'برای این جدول ستون مجاز تعریف نشده است.';
        else {
            try {
                $db = $config['mysql'];
                $dsn = 'mysql:host=' . $db['host'] . ';dbname=' . $db['database'] . ';charset=' . ($db['charset'] ?? 'utf8mb4');
                $pdo = new PDO($dsn, $db['username'], $db['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_TIMEOUT=>5]);
                $quote = static fn(string $identifier): string => chr(96) . str_replace(chr(96), chr(96) . chr(96), $identifier) . chr(96);
                $tableSql = $quote($selectedTable);
                $where = ''; $params = [];
                if ($search !== '' && $searchColumns) {
                    $clauses = [];
                    foreach ($searchColumns as $i => $column) { $key = ':q' . $i; $clauses[] = $quote($column) . ' LIKE ' . $key; $params[$key] = '%' . $search . '%'; }
                    $where = ' WHERE (' . implode(' OR ', $clauses) . ')';
                }
                $countStmt = $pdo->prepare('SELECT COUNT(*) FROM ' . $tableSql . $where);
                foreach ($params as $key=>$value) $countStmt->bindValue($key,$value,PDO::PARAM_STR);
                $countStmt->execute(); $total = (int)$countStmt->fetchColumn();
                $offset = ($page - 1) * $pageSize;
                $select = implode(', ', array_map($quote, $allowedColumns));
                $stmt = $pdo->prepare('SELECT ' . $select . ' FROM ' . $tableSql . $where . ' LIMIT ' . $pageSize . ' OFFSET ' . $offset);
                foreach ($params as $key=>$value) $stmt->bindValue($key,$value,PDO::PARAM_STR);
                $stmt->execute(); $rows = $stmt->fetchAll(); $columns = $allowedColumns;
            } catch (Throwable $e) {
                error_log('[tusan-db-inspector] database read failed: ' . get_class($e));
                $notice = 'خواندن داده انجام نشد. تنظیمات اتصال یا فهرست ستون‌ها را بررسی کنید.';
            }
        }
    }
}
?>
<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>بررسی‌گر دیتابیس توسن</title>
<style>
:root{color-scheme:light;--ink:#182230;--muted:#667085;--line:#e4e7ec;--surface:#fff;--bg:#f5f7fa;--accent:#174ea6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Tahoma,Arial,sans-serif;font-size:14px;line-height:1.8}
main{max-width:1200px;margin:28px auto;padding:0 16px}.panel{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px #10182808}
h1{font-size:22px;margin:0 0 8px}h2{font-size:16px;margin:0 0 12px}.muted{color:var(--muted)}.layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:16px}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}label{display:block;margin:8px 0 4px}
input,button{font:inherit;padding:9px 10px;border:1px solid #cfd5df;border-radius:7px;background:#fff;max-width:100%}input[type=password],input[type=search]{width:100%}
button{background:var(--accent);color:#fff;border-color:var(--accent);cursor:pointer}.inline{display:inline-flex;gap:8px;align-items:center}.toolbar{display:flex;gap:12px;align-items:end;flex-wrap:wrap}
table{border-collapse:collapse;width:100%;background:#fff}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:right;vertical-align:top;overflow-wrap:anywhere}th{background:#f9fafb;white-space:nowrap}
.table-wrap{overflow:auto;max-width:100%}.count{font-weight:bold}.notice{background:#fff7e6;border:1px solid #f3d28b;border-radius:8px;padding:10px;margin:12px 0}
.login{max-width:440px;margin:8vh auto}.cell{max-width:420px;white-space:pre-wrap;word-break:break-word}.pager{display:flex;gap:16px;align-items:center;margin-top:16px}
@media(max-width:760px){.layout{grid-template-columns:1fr}main{margin:12px auto}.panel{padding:14px}h1{font-size:19px}}
</style></head><body><main>
<?php if (!$loggedIn): ?>
<section class="panel login"><h1>بررسی‌گر دیتابیس توسن</h1><p class="muted">دسترسی محدود و فقط‌خواندنی</p>
<?php if ($error !== ''): ?><div class="notice"><?= h($error) ?></div><?php endif; ?>
<form method="post" autocomplete="off"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="login"><label for="password">رمز دسترسی</label><input id="password" type="password" name="password" required autocomplete="current-password"><p><button type="submit">ورود</button></p></form></section>
<?php else: ?>
<header class="panel"><div class="toolbar" style="justify-content:space-between"><div><h1>بررسی‌گر دیتابیس توسن</h1><div class="muted">نمایش مستقیم داده‌ها — فقط خواندنی</div></div><form method="post"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="logout"><button type="submit">خروج</button></form></div></header>
<?php if ($notice !== ''): ?><div class="notice"><?= h($notice) ?></div><?php endif; ?>
<div class="layout"><aside class="panel"><h2>بخش‌های مجاز</h2><ul><?php foreach ($config['tables'] as $tableName=>$definition): ?><li><a href="?table=<?= rawurlencode((string)$tableName) ?>"><?= h($definition['label'] ?? $tableName) ?></a></li><?php endforeach; ?></ul><p class="muted">فقط جدول‌ها و ستون‌های مجازشده در تنظیمات سرور نمایش داده می‌شوند.</p></aside>
<section class="panel"><?php if ($selectedTable === ''): ?><h2>یک بخش را انتخاب کنید</h2><p class="muted">برای جلوگیری از نمایش ناخواسته اطلاعات حساس، تا انتخاب جدول هیچ رکوردی بارگیری نمی‌شود.</p>
<?php else: ?><h2><?= h($config['tables'][$selectedTable]['label'] ?? $selectedTable) ?></h2>
<form method="get" class="toolbar"><input type="hidden" name="table" value="<?= h($selectedTable) ?>"><div style="flex:1;min-width:200px"><label for="q">جستجو</label><input id="q" type="search" name="q" value="<?= h($search) ?>" maxlength="200" placeholder="عبارت جستجو"></div><button type="submit">جستجو</button><a href="?table=<?= rawurlencode($selectedTable) ?>">پاک کردن</a></form>
<p class="muted">تعداد نتایج: <span class="count"><?= number_format($total) ?></span> — هر صفحه حداکثر 25 ردیف</p>
<div class="table-wrap"><table><thead><tr><?php foreach ($columns as $column): ?><th><?= h($column) ?></th><?php endforeach; ?></tr></thead><tbody>
<?php if (!$rows): ?><tr><td colspan="<?= max(1,count($columns)) ?>" class="muted">رکوردی یافت نشد.</td></tr><?php else: foreach ($rows as $row): ?><tr><?php foreach ($columns as $column): ?><td class="cell"><?= h($row[$column] ?? null) ?></td><?php endforeach; ?></tr><?php endforeach; endif; ?>
</tbody></table></div><div class="pager"><?php if ($page>1): ?><a href="?table=<?= rawurlencode($selectedTable) ?>&amp;q=<?= rawurlencode($search) ?>&amp;page=<?= $page-1 ?>">صفحه قبل</a><?php endif; ?><span>صفحه <?= number_format($page) ?> از <?= number_format(max(1,(int)ceil($total/25))) ?></span><?php if ($page<(int)ceil($total/25)): ?><a href="?table=<?= rawurlencode($selectedTable) ?>&amp;q=<?= rawurlencode($search) ?>&amp;page=<?= $page+1 ?>">صفحه بعد</a><?php endif; ?></div>
<?php endif; ?></section></div>
<?php endif; ?>
</main></body></html>
