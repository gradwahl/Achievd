$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root ".postgres\pgsql\bin"
$data = Join-Path $root ".postgres\data"
$log = Join-Path $root ".postgres\postgres.log"

& (Join-Path $bin "pg_ctl.exe") -D $data -o "-p 5432" -l $log start
