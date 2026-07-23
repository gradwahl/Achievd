$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root ".postgres\pgsql\bin"
$data = Join-Path $root ".postgres\data"

& (Join-Path $bin "pg_ctl.exe") -D $data stop
