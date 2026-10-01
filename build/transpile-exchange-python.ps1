#!/usr/bin/env pwsh
# ----------------------------------------------------------------------------
# Emit Python REST (and optionally WebSocket) exchange modules from TS sources,
# the same way the ccxt/npm build pipeline does (tsx build/transpile.ts, etc.).
#
# Prerequisites: Node/npm in PATH, deps installed (`npm ci` / `npm install` in repo root).
#
# Usage (from repo root or any cwd):
#   .\build\transpile-exchange-python.ps1 binance
#   .\build\transpile-exchange-python.ps1 binance kucoin coinbase
#   .\build\transpile-exchange-python.ps1 binance kucoin -Ws
#   .\build\transpile-exchange-python.ps1 -BaseClass
#   .\build\transpile-exchange-python.ps1 -Error
#   .\build\transpile-exchange-python.ps1 binance -BaseClass
#   .\build\transpile-exchange-python.ps1 binance -Error
#   .\build\transpile-exchange-python.ps1 binance -CcxtRoot C:\repos\ccxt
#   .\build\transpile-exchange-python.ps1 --all-ob
#
# TS editing notes (build/transpile.ts splits the class on blank lines; see CONTRIBUTING.md):
#   - Each "method" chunk must start with its signature (or 'async' + signature). A chunk
#     that is only comments / JSDoc will fail (e.g. "Make sure your methods don't have empty lines").
#   - Optional Python params must use defaults in order, e.g. logTag: Str = undefined if params={}.
# ----------------------------------------------------------------------------
[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [Alias('ExchangeId')]
    [string[]]$ExchangeIds,

    [Alias('all-ob')]
    [switch]$AllOb,

    [switch]$Ws,

    [switch]$IncludePhp,

    [string]$CcxtRoot,

    [switch]$SkipExportExchanges,

    [switch]$SkipImplicitApi,

    [switch]$BaseClass,

    # Named TranspileErrors because PowerShell reserves read-only $Error.
    [Alias('Error')]
    [switch]$TranspileErrors
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $CcxtRoot) {
    $CcxtRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).ProviderPath
}

# Support GNU-style flag passed as a positional arg (for example: --all-ob),
# which can end up in ValueFromRemainingArguments before named binding.
if ($null -ne $ExchangeIds -and ($ExchangeIds -contains "--all-ob")) {
    $AllOb = $true
    $ExchangeIds = @($ExchangeIds | Where-Object { $_ -ne "--all-ob" })
}

$exchangeIdsLower = @()
$transpileBaseClassOrErrorOnly = $BaseClass.IsPresent -or $TranspileErrors.IsPresent
# When no remaining args, $ExchangeIds is $null; @($null) would incorrectly count as 1.
$providedExchangeIdCount = if ($null -eq $ExchangeIds) { 0 } else { $ExchangeIds.Count }

if ($transpileBaseClassOrErrorOnly) {
    if ($Ws.IsPresent) {
        Write-Error "-Ws cannot be used with -BaseClass or -Error."
    }
    if ($providedExchangeIdCount -gt 0) {
        Write-Warning "Ignoring exchange ids because -BaseClass or -TranspileErrors (-Error) was specified."
    }
    if ($AllOb.IsPresent) {
        Write-Warning "Ignoring -AllOb because -BaseClass or -TranspileErrors (-Error) was specified."
    }
}
else {
    if ($AllOb.IsPresent -and $providedExchangeIdCount -gt 0) {
        Write-Error "-AllOb cannot be combined with explicit exchange ids."
    }
    if ((-not $AllOb.IsPresent) -and $providedExchangeIdCount -eq 0) {
        Write-Error "At least one exchange id is required unless -BaseClass or -Error is specified."
    }
    if ($AllOb.IsPresent) {
        $obExchangePaths = @(Get-ChildItem -LiteralPath (Join-Path $CcxtRoot "ts/src") -Filter "ob_*.ts" -File | Sort-Object -Property Name)
        if ($obExchangePaths.Count -eq 0) {
            Write-Error "No ob_ exchange TypeScript files found under ts/src."
        }
        foreach ($obExchangePath in $obExchangePaths) {
            $exchangeIdsLower += [System.IO.Path]::GetFileNameWithoutExtension($obExchangePath.Name).ToLowerInvariant()
        }
    }
    foreach ($rawExchangeId in @($ExchangeIds)) {
        $lowerExchangeId = $rawExchangeId.ToLowerInvariant()
        if ($exchangeIdsLower -notcontains $lowerExchangeId) {
            $exchangeIdsLower += $lowerExchangeId
        }
    }
    
    $missingRestTsPaths = @()
    foreach ($exchangeIdLower in $exchangeIdsLower) {
        $restTsPath = Join-Path $CcxtRoot ("ts/src/{0}.ts" -f $exchangeIdLower)
        if (-not (Test-Path -LiteralPath $restTsPath)) {
            $missingRestTsPaths += $restTsPath
        }
    }
    if ($missingRestTsPaths.Count -gt 0) {
        Write-Error ("REST TypeScript file(s) not found:`n{0}`nExpected ccxt authoritative source under ts/src (see CONTRIBUTING.md)." -f ($missingRestTsPaths -join "`n"))
    }
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
        [string[]]$Ids
    )
    $exchangesJsonPath = Join-Path $Root "exchanges.json"
    if (Test-Path -LiteralPath $exchangesJsonPath) {
        return
    }
    $wsIds = @($Ids | Where-Object {
            Test-Path -LiteralPath (Join-Path $Root ("ts/src/pro/{0}.ts" -f $_))
        })
    $payload = [ordered]@{
        ids = @($Ids)
        ws  = $wsIds
    }
    $json = $payload | ConvertTo-Json -Depth 5
    Set-Content -LiteralPath $exchangesJsonPath -Value $json -Encoding utf8
    Write-Warning (
        ("Created minimal exchanges.json for {0} exchange id(s) (partial export-exchanges does not emit it). " -f $Ids.Count) +
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
    if ((-not $SkipExportExchanges) -and (-not $transpileBaseClassOrErrorOnly)) {
        Write-Host ":: export-exchanges -> exchanges.json ids (partial when subset of ids)" -ForegroundColor Cyan
        Invoke-CcxtRepo (@("run", "export-exchanges", "--") + $exchangeIdsLower)
    }

    if ((-not $SkipImplicitApi) -and (-not $transpileBaseClassOrErrorOnly)) {
        Write-Host ":: generateImplicitAPI (Python stubs)" -ForegroundColor Cyan
        Invoke-Tsx @("build/generateImplicitAPI.ts", "--", "--python")
    }

    if (-not $transpileBaseClassOrErrorOnly) {
        Ensure-ExchangesJson -Root $CcxtRoot -Ids $exchangeIdsLower
    }

    Write-Host ":: transpile REST TS -> Python" -ForegroundColor Cyan
    $transpileRestArgs = @("build/transpile.ts")
    if (-not $IncludePhp) {
        $transpileRestArgs += "--python"
    }
    if ($BaseClass.IsPresent) {
        $transpileRestArgs += "--baseClass"
    }
    if ($TranspileErrors.IsPresent) {
        $transpileRestArgs += "--error"
    }
    if (-not $transpileBaseClassOrErrorOnly) {
        $transpileRestArgs += $exchangeIdsLower
    }
    Invoke-Tsx $transpileRestArgs

    if ($Ws.IsPresent -and (-not $transpileBaseClassOrErrorOnly)) {
        $wsExchangeIds = @()
        $missingWsExchangeIds = @()
        foreach ($exchangeIdLower in $exchangeIdsLower) {
            $proTsPath = Join-Path $CcxtRoot ("ts/src/pro/{0}.ts" -f $exchangeIdLower)
            if (Test-Path -LiteralPath $proTsPath) {
                $wsExchangeIds += $exchangeIdLower
            }
            else {
                $missingWsExchangeIds += $exchangeIdLower
            }
        }
        foreach ($missingWsId in $missingWsExchangeIds) {
            Write-Warning ("No WS TypeScript implementation at ts/src/pro/{0}.ts; skipping." -f $missingWsId)
        }
        if ($wsExchangeIds.Count -eq 0) {
            Write-Warning "No WebSocket TypeScript implementations found for any requested exchange; skipping transpileWS."
        }
        else {
            Write-Host ":: compile pro/exchange TS to js (transpileWS imports js/ccxt)" -ForegroundColor Cyan
            $proRelativePaths = $wsExchangeIds | ForEach-Object { "ts/src/pro/$_.ts" }
            Invoke-CcxtRepo (@("run", "tsBuildFile", "--") + $proRelativePaths)

            Write-Host ":: transpile WebSocket TS -> Python" -ForegroundColor Cyan
            $transpileWsArgs = @("build/transpileWS.ts")
            if (-not $IncludePhp) {
                $transpileWsArgs += "--python"
            }
            $transpileWsArgs += $wsExchangeIds
            Invoke-Tsx $transpileWsArgs
        }
    }

    Write-Host ''
    if ($transpileBaseClassOrErrorOnly) {
        Write-Host "Transpilation finished." -ForegroundColor Green
        if ($BaseClass.IsPresent) {
            Write-Host "  Base class:      python/ccxt/base/exchange.py"
            Write-Host "  Base async:      python/ccxt/async_support/base/exchange.py"
        }
        if ($TranspileErrors.IsPresent) {
            Write-Host "  Errors:          python/ccxt/base/errors.py"
        }
    }
    else {
        $summaryIndex = 0
        foreach ($exchangeIdLower in $exchangeIdsLower) {
            if ($summaryIndex -gt 0) {
                Write-Host ''
            }
            $summaryIndex++
            Write-Host "Transpilation finished for '$exchangeIdLower'." -ForegroundColor Green
            Write-Host "  REST sync:       python/ccxt/$exchangeIdLower.py"
            Write-Host "  REST async:      python/ccxt/async_support/$exchangeIdLower.py"
            if ($Ws.IsPresent -and (Test-Path -LiteralPath (Join-Path $CcxtRoot "ts/src/pro/$exchangeIdLower.ts"))) {
                Write-Host "  Pro (async/ws):  python/ccxt/pro/$exchangeIdLower.py"
            }
        }
    }
}
finally {
    Pop-Location
}
