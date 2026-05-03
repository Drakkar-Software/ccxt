#!/usr/bin/env pwsh
# ----------------------------------------------------------------------------
# Emit Python REST (and optionally WebSocket) exchange modules from TS sources,
# the same way the ccxt/npm build pipeline does (tsx build/transpile.ts, etc.).
#
# Prerequisites: Node/npm in PATH, deps installed (`npm ci` / `npm install` in repo root).
#
# Usage (from repo root or any cwd):
#   .\build\transpile-exchange-python.ps1 binance
#   .\build\transpile-exchange-python.ps1 binance -Ws
#   .\build\transpile-exchange-python.ps1 binance -CcxtRoot C:\repos\ccxt
# ----------------------------------------------------------------------------
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ExchangeId,

    [switch]$Ws,

    [switch]$IncludePhp,

    [string]$CcxtRoot,

    [switch]$SkipExportExchanges,

    [switch]$SkipImplicitApi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $CcxtRoot) {
    $CcxtRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).ProviderPath
}

$exchangeIdLower = $ExchangeId.ToLowerInvariant()
$restTs = Join-Path $CcxtRoot ("ts/src/{0}.ts" -f $exchangeIdLower)
if (-not (Test-Path -LiteralPath $restTs)) {
    Write-Error ("REST TypeScript file not found: {0}`nExpected ccxt authoritative source under ts/src (see CONTRIBUTING.md)." -f $restTs)
}

function Invoke-CcxtRepo {
    param([string[]]$CommandArgs)
    $prev = @{ ErrorActionPreference = $ErrorActionPreference }
    try {
        $ErrorActionPreference = "Continue"
        $out = npm @CommandArgs 2>&1
        $exit = $LASTEXITCODE
        if ($exit -ne 0) {
            foreach ($line in $out) { Write-Host $line }
            throw ("Command failed ({0}): npm {1}" -f $exit, ($CommandArgs -join " "))
        }
        foreach ($line in $out) { Write-Host $line }
    }
    finally {
        $ErrorActionPreference = $prev.ErrorActionPreference
    }
}

# Upstream `node build/export-exchanges <id>` uses a partial build that returns before
# writing exchanges.json (see export-exchanges.js), but build/transpile.ts requires
# that file at load time — synthesize a minimal JSON when it is missing.
function Ensure-ExchangesJson {
    param(
        [string]$Root,
        [string]$Id
    )
    $exchangesJsonPath = Join-Path $Root "exchanges.json"
    if (Test-Path -LiteralPath $exchangesJsonPath) {
        return
    }
    $wsIds = @()
    $proTs = Join-Path $Root ("ts/src/pro/{0}.ts" -f $Id)
    if (Test-Path -LiteralPath $proTs) {
        $wsIds = @($Id)
    }
    $payload = [ordered]@{
        ids = @($Id)
        ws  = $wsIds
    }
    $json = $payload | ConvertTo-Json -Depth 5
    Set-Content -LiteralPath $exchangesJsonPath -Value $json -Encoding utf8
    Write-Warning (
        "Created minimal exchanges.json (partial export-exchanges does not emit it). " +
        "For a full tree run: npm run export-exchanges (no args) from the CCXT root."
    )
}

# Re-run `tsx` via build/launch-tsx-ccxt.mjs so transpile/ts main entry detection works
# when the repo root is opened through a symlink/junction (canonical path in argv).
function Invoke-Tsx {
    param([string[]]$TsxArgs)
    $launcher = Join-Path $CcxtRoot "build/launch-tsx-ccxt.mjs"
    if (-not (Test-Path -LiteralPath $launcher)) {
        throw ("TSX launcher not found: {0}" -f $launcher)
    }
    $prev = @{ ErrorActionPreference = $ErrorActionPreference }
    try {
        $ErrorActionPreference = "Continue"
        $out = & node $launcher @TsxArgs 2>&1
        $exit = $LASTEXITCODE
        if ($exit -ne 0) {
            foreach ($line in $out) { Write-Host $line }
            throw ("Command failed ({0}): node {1} {2}" -f $exit, $launcher, ($TsxArgs -join " "))
        }
        foreach ($line in $out) { Write-Host $line }
    }
    finally {
        $ErrorActionPreference = $prev.ErrorActionPreference
    }
}

Push-Location -LiteralPath $CcxtRoot
try {
    if (-not $SkipExportExchanges) {
        Write-Host ":: export-exchanges -> exchanges.json ids (partial when single id)" -ForegroundColor Cyan
        Invoke-CcxtRepo @("run", "export-exchanges", "--", $exchangeIdLower)
    }

    if (-not $SkipImplicitApi) {
        Write-Host ":: generateImplicitAPI (Python stubs)" -ForegroundColor Cyan
        Invoke-Tsx @("build/generateImplicitAPI.ts", "--", "--python")
    }

    Ensure-ExchangesJson -Root $CcxtRoot -Id $exchangeIdLower

    Write-Host ":: transpile REST TS -> Python" -ForegroundColor Cyan
    if ($IncludePhp) {
        Invoke-Tsx @("build/transpile.ts", $exchangeIdLower)
    }
    else {
        Invoke-Tsx @("build/transpile.ts", "--python", $exchangeIdLower)
    }

    if ($Ws.IsPresent) {
        $proTsPath = Join-Path $CcxtRoot ("ts/src/pro/{0}.ts" -f $exchangeIdLower)
        if (-not (Test-Path -LiteralPath $proTsPath)) {
            Write-Warning ("No WS TypeScript implementation at {0}; skipping transpileWS." -f $proTsPath)
        }
        else {
            Write-Host ":: compile this pro/exchange TS to js (transpileWS imports js/ccxt)" -ForegroundColor Cyan
            Invoke-CcxtRepo @("run", "tsBuildFile", "--", "ts/src/pro/$exchangeIdLower.ts")

            Write-Host ":: transpile WebSocket TS -> Python" -ForegroundColor Cyan
            if ($IncludePhp) {
                Invoke-Tsx @("build/transpileWS.ts", $exchangeIdLower)
            }
            else {
                Invoke-Tsx @("build/transpileWS.ts", "--python", $exchangeIdLower)
            }
        }
    }

    Write-Host ''
    Write-Host "Transpilation finished for '$exchangeIdLower'." -ForegroundColor Green
    Write-Host "  REST sync:       python/ccxt/$exchangeIdLower.py"
    Write-Host "  REST async:      python/ccxt/async_support/$exchangeIdLower.py"
    if ($Ws.IsPresent -and (Test-Path -LiteralPath (Join-Path $CcxtRoot "ts/src/pro/$exchangeIdLower.ts"))) {
        Write-Host "  Pro (async/ws):  python/ccxt/pro/$exchangeIdLower.py"
    }
}
finally {
    Pop-Location
}
