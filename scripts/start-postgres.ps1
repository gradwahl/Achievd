$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root ".postgres\pgsql\bin"
$data = Join-Path $root ".postgres\data"
$log = Join-Path $root ".postgres\postgres.log"

$env:PGPASSWORD = "postgres"
& (Join-Path $bin "pg_isready.exe") -h localhost -p 5432 -U postgres *> $null
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $bin "pg_ctl.exe") -D $data -o "-p 5432" -l $log start
  & (Join-Path $bin "pg_isready.exe") -h localhost -p 5432 -U postgres
}

$exists = & (Join-Path $bin "psql.exe") -h localhost -p 5432 -U postgres -d postgres -Atc "select 1 from pg_database where datname = 'Achievd'"
if ($exists -ne "1") {
  & (Join-Path $bin "createdb.exe") -h localhost -p 5432 -U postgres Achievd
}
