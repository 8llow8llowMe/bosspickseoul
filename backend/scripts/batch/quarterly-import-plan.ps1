<#
.SYNOPSIS
    Emits quarterly import commands for the batch-service CLI (quarterly profile).

.DESCRIPTION
    This script only prints commands. It never touches the database and never runs the jar.
    Review the output, then run one block at a time: dry-run first, publish only after the
    dry-run logs COMPLETED and dataset_release shows expected = input = accepted with
    rejected/duplicate/unmapped all zero.

    All 15 datasets are covered: 7 commercial-area, 3 administrative-dong, 5 district.
    Nine of them ignore the quarter path argument, so only their first quarter is fetched
    over the API and the rest replay that run's archived pages (BATCH_RAW_DIRECTORY).

    Operator steps and prerequisites: backend/docs/services/batch-quarterly-import.md
    Progress and remaining slots:     backend/scripts/migration/quarterly-import-coverage.sql

.PARAMETER Dataset
    Dataset names to emit. Defaults to all 15, ordered smallest/safest first.

.PARAMETER Period
    Quarter codes such as 20241. Defaults to 20211..20261 (20261 is the newest quarter
    loaded into the development database as of 2026-09-11).

.PARAMETER Job
    Which CLI job to emit. 'facts' loads the Open API into dataset_fact. 'project' moves an
    already published release into the legacy fact-table columns. Run facts first, then
    project for the same dataset and quarter; nothing reaches the screens until project runs.

.PARAMETER ReplayPublish
    Emit the runs that follow the first API fetch of a slot as ARCHIVE replays of it, instead of
    fetching the same pages again. Every API run archives its pages and records raw_location, and
    a dry-run archives them too, so the later runs of a slot can replay that directory. This halves
    the API calls for a slot with a known row count and cuts them to a third for a probed slot,
    which matters because the Open API allows 1,000 calls per key per day and STORE_COMMERCIAL
    alone costs about 78 per quarter. Only affects -Job facts.

.PARAMETER SpatialVersion
    Published spatial snapshot to validate area codes against. Must already be READY.

.PARAMETER Attempt
    First run-id suffix. Each emitted step increments it, because expected_rows is part of
    the request fingerprint and a run-id is never reused with changed parameters.

.PARAMETER SummaryOnly
    Print the dataset plan table without the commands.

.EXAMPLE
    .\quarterly-import-plan.ps1 -Dataset CHANGE_DISTRICT
    Every quarter of one dataset.

.EXAMPLE
    .\quarterly-import-plan.ps1 -Period 20241,20242 | Set-Content plan.txt
    Two quarters of all 15 datasets, saved for review.

.EXAMPLE
    .\quarterly-import-plan.ps1 -Job project | Set-Content project.txt
    Typed projection for every published dataset and quarter.

.EXAMPLE
    .\quarterly-import-plan.ps1 -Dataset STORE_COMMERCIAL -ReplayPublish
    The largest dataset, fetching each quarter from the API once instead of three times.
#>
[CmdletBinding()]
param(
    [string[]] $Dataset,
    [string[]] $Period,
    [ValidateSet('facts', 'project')]
    [string]   $Job = 'facts',
    [string]   $SpatialVersion = 'legacy-20233',
    [string]   $SchemaVersion = 'seoul-v1',
    [int]      $Attempt = 1,
    [switch]   $ReplayPublish,
    [switch]   $SummaryOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# HonorsPeriod  = the Open API respects the quarter path argument, so every quarter is a
#                 separate API call. The other nine return the whole 2021+ timeline, so the
#                 first quarter is fetched once and later quarters replay it via ARCHIVE.
# FixedRows     = row count that holds for every quarter. CHANGE_COMMERCIAL 1650 is confirmed
#                 by published runs; the district trio is 25 boroughs per quarter.
# Rows20241     = list_total_count for 20241 only. Other quarters differ, so they need a probe.
$catalog = @(
    [pscustomobject]@{ Order = 1;  Name = 'CHANGE_COMMERCIAL';          Scope = 'COMMERCIAL';     HonorsPeriod = $true;  FixedRows = 1650; Rows20241 = 1650 }
    [pscustomobject]@{ Order = 2;  Name = 'CHANGE_DISTRICT';            Scope = 'DISTRICT';       HonorsPeriod = $false; FixedRows = 25;   Rows20241 = $null }
    [pscustomobject]@{ Order = 3;  Name = 'FOOT_TRAFFIC_DISTRICT';      Scope = 'DISTRICT';       HonorsPeriod = $false; FixedRows = 25;   Rows20241 = $null }
    [pscustomobject]@{ Order = 4;  Name = 'CONSUMPTION_DISTRICT';       Scope = 'DISTRICT';       HonorsPeriod = $false; FixedRows = 25;   Rows20241 = $null }
    [pscustomobject]@{ Order = 5;  Name = 'FOOT_TRAFFIC_COMMERCIAL';    Scope = 'COMMERCIAL';     HonorsPeriod = $true;  FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 6;  Name = 'POPULATION_COMMERCIAL';      Scope = 'COMMERCIAL';     HonorsPeriod = $false; FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 7;  Name = 'FACILITY_COMMERCIAL';        Scope = 'COMMERCIAL';     HonorsPeriod = $false; FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 8;  Name = 'CONSUMPTION_COMMERCIAL';     Scope = 'COMMERCIAL';     HonorsPeriod = $false; FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 9;  Name = 'CONSUMPTION_ADMINISTRATION'; Scope = 'ADMINISTRATION'; HonorsPeriod = $false; FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 10; Name = 'SALES_DISTRICT';             Scope = 'DISTRICT';       HonorsPeriod = $false; FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 11; Name = 'STORE_DISTRICT';             Scope = 'DISTRICT';       HonorsPeriod = $false; FixedRows = $null; Rows20241 = $null }
    [pscustomobject]@{ Order = 12; Name = 'SALES_ADMINISTRATION';       Scope = 'ADMINISTRATION'; HonorsPeriod = $true;  FixedRows = $null; Rows20241 = 17044 }
    [pscustomobject]@{ Order = 13; Name = 'SALES_COMMERCIAL';           Scope = 'COMMERCIAL';     HonorsPeriod = $true;  FixedRows = $null; Rows20241 = 21910 }
    [pscustomobject]@{ Order = 14; Name = 'STORE_ADMINISTRATION';       Scope = 'ADMINISTRATION'; HonorsPeriod = $true;  FixedRows = $null; Rows20241 = 35330 }
    [pscustomobject]@{ Order = 15; Name = 'STORE_COMMERCIAL';           Scope = 'COMMERCIAL';     HonorsPeriod = $true;  FixedRows = $null; Rows20241 = 77025 }
)

$allPeriods = @(
    '20211', '20212', '20213', '20214'
    '20221', '20222', '20223', '20224'
    '20231', '20232', '20233', '20234'
    '20241', '20242', '20243', '20244'
    '20251', '20252', '20253', '20254'
    '20261'
)

function Resolve-Selection {
    param($Requested, $Available, [string]$Label)

    if (-not $Requested) { return $Available }
    $unknown = @($Requested | Where-Object { $Available -notcontains $_ })
    if ($unknown) {
        throw ("Unknown {0}: {1}. Known values: {2}" -f $Label, ($unknown -join ', '), ($Available -join ', '))
    }
    return $Available | Where-Object { $Requested -contains $_ }
}

function Get-RunId {
    param([string]$DatasetName, [string]$PeriodCode, [int]$AttemptNumber)

    '{0}-{1}-{2:D3}' -f $DatasetName.ToLowerInvariant().Replace('_', '-'), $PeriodCode, $AttemptNumber
}

function Get-SourceUpdatedAt {
    param([string]$PeriodCode)

    $year = $PeriodCode.Substring(0, 4)
    $quarterEnd = switch ($PeriodCode.Substring(4, 1)) {
        '1' { '03-31' }
        '2' { '06-30' }
        '3' { '09-30' }
        '4' { '12-31' }
        default { throw "Quarter must be 1-4: $PeriodCode" }
    }
    '{0}-{1}T00:00:00Z' -f $year, $quarterEnd
}

function Format-ImportCommand {
    param(
        [string]$DatasetName,
        [string]$PeriodCode,
        [string]$RunId,
        [string]$Source,
        [string]$SourceFile,
        [string]$ExpectedRows,
        [string]$SourceUpdatedAt,
        [bool]$DryRun
    )

    $sourceFilePart = if ($SourceFile) { " --source-file=$SourceFile" } else { '' }
    $command = 'java -jar $jar --job=facts --run-id={0} --dataset={1} --period={2} --source={3}{4}' +
               ' --spatial-version={5} --schema-version={6} --expected-rows={7} --source-updated-at={8} --dry-run={9}'
    $command -f $RunId, $DatasetName, $PeriodCode, $Source, $sourceFilePart,
                $SpatialVersion, $SchemaVersion, $ExpectedRows, $SourceUpdatedAt,
                $DryRun.ToString().ToLowerInvariant()
}

function Format-ProjectionCommand {
    param(
        [string]$DatasetName,
        [string]$PeriodCode,
        [string]$RunId,
        [bool]$DryRun
    )

    $command = 'java -jar $jar --job=project --run-id={0} --dataset={1} --period={2}' +
               ' --spatial-version={3} --dry-run={4}'
    $command -f $RunId, $DatasetName, $PeriodCode, $SpatialVersion,
                $DryRun.ToString().ToLowerInvariant()
}

# @() is required at every call site: a function returning one item hands back a bare object,
# and Set-StrictMode makes reading .Count on it throw.
$selectedNames = @(Resolve-Selection -Requested $Dataset -Available ($catalog.Name) -Label 'dataset')
$selectedPeriods = @(Resolve-Selection -Requested $Period -Available $allPeriods -Label 'period')
$selected = @($catalog | Where-Object { $selectedNames -contains $_.Name } | Sort-Object Order)

''
'# Quarterly import plan'
if ($Job -eq 'project') {
    # --job=project takes neither a source nor a schema-version, so printing them would mislead.
    ("# job=project  spatial-version={0}  datasets={1}  quarters={2}" -f
        $SpatialVersion, $selected.Count, $selectedPeriods.Count)
}
else {
    ("# job=facts  spatial-version={0}  schema-version={1}  datasets={2}  quarters={3}  replay-publish={4}" -f
        $SpatialVersion, $SchemaVersion, $selected.Count, $selectedPeriods.Count,
        $ReplayPublish.ToString().ToLowerInvariant())
}
'# Prerequisite: the spatial snapshot above is published (dataset_spatial_release.status = READY).'
'# Run one dataset at a time. Never reuse a run-id after changing any parameter.'
''

# PeriodArg / Source / RowsPerQuarter describe how a dataset is fetched from the Open API.
# Projection reads an already published release, so those columns are omitted for -Job project.
$summaryColumns = if ($Job -eq 'project') {
    @(@{ n = 'Order'; e = { $_.Order } },
      @{ n = 'Dataset'; e = { $_.Name } },
      @{ n = 'Scope'; e = { $_.Scope } })
}
else {
    @(@{ n = 'Order'; e = { $_.Order } },
      @{ n = 'Dataset'; e = { $_.Name } },
      @{ n = 'Scope'; e = { $_.Scope } },
      @{ n = 'PeriodArg'; e = { if ($_.HonorsPeriod) { 'honoured' } else { 'ignored' } } },
      @{ n = 'Source'; e = { if ($_.HonorsPeriod) { 'API' } else { 'API + ARCHIVE' } } },
      @{ n = 'RowsPerQuarter'; e = { if ($null -ne $_.FixedRows) { $_.FixedRows } else { 'probe' } } })
}

$selected |
    Select-Object $summaryColumns |
    Format-Table -AutoSize |
    Out-String -Width 200 |
    ForEach-Object { $_.TrimEnd() -split "`r?`n" } |
    ForEach-Object { if ($_) { "# $_" } else { '#' } }

if ($SummaryOnly) {
    ''
    '# -SummaryOnly was set, so no commands were emitted.'
    return
}

if ($Job -eq 'project') {
    ''
    '# Typed projection. Each dataset and quarter must already be PUBLISHED by --job=facts;'
    '# the job reads the active dataset_fact release and replaces the (period, spatial-version)'
    '# rows of the legacy fact table. Re-running a slot is safe because it deletes first.'
    '# Remaining slots: quarterly-import-coverage.sql section 5.'

    foreach ($entry in $selected) {
        ''
        '# ' + ('=' * 96)
        "# {0}  ({1})" -f $entry.Name, $entry.Scope
        '# ' + ('=' * 96)

        foreach ($periodCode in $selectedPeriods) {
            # runId is the only identifying job parameter, so the publish run needs its own
            # suffix. Reusing the dry-run id makes Spring Batch refuse the second execution.
            $attemptNumber = $Attempt

            ''
            "# ---- {0} {1} ----" -f $entry.Name, $periodCode
            Format-ProjectionCommand -DatasetName $entry.Name -PeriodCode $periodCode `
                -RunId ('project-{0}' -f (Get-RunId $entry.Name $periodCode $attemptNumber)) -DryRun $true
            $attemptNumber++
            Format-ProjectionCommand -DatasetName $entry.Name -PeriodCode $periodCode `
                -RunId ('project-{0}' -f (Get-RunId $entry.Name $periodCode $attemptNumber)) -DryRun $false
        }
    }

    ''
    '# Done. Confirm with quarterly-import-coverage.sql sections 5 and 6.'
    return
}

foreach ($entry in $selected) {
    ''
    '# ' + ('=' * 96)
    "# {0}  ({1}, quarter argument {2})" -f $entry.Name, $entry.Scope,
        $(if ($entry.HonorsPeriod) { 'honoured' } else { 'ignored - first quarter over API, rest replayed' })
    '# ' + ('=' * 96)

    $firstPeriod = $selectedPeriods | Select-Object -First 1

    foreach ($periodCode in $selectedPeriods) {
        $sourceUpdatedAt = Get-SourceUpdatedAt -PeriodCode $periodCode
        $attemptNumber = $Attempt

        # Placeholders avoid angle brackets on purpose: PowerShell reserves '<' and refuses to
        # parse a pasted line that contains it.
        $useArchive = (-not $entry.HonorsPeriod) -and ($periodCode -ne $firstPeriod)
        $source = if ($useArchive) { 'ARCHIVE' } else { 'API' }
        $sourceFile = if ($useArchive) { 'REPLACE_WITH_RAW_LOCATION' } else { '' }

        $knownRows = if ($null -ne $entry.FixedRows) {
            $entry.FixedRows
        }
        elseif ($periodCode -eq '20241' -and $null -ne $entry.Rows20241) {
            $entry.Rows20241
        }
        else {
            $null
        }

        ''
        "# ---- {0} {1} ----" -f $entry.Name, $periodCode

        if ($useArchive) {
            "# Replace REPLACE_WITH_RAW_LOCATION using the {0} {1} run:" -f $entry.Name, $firstPeriod
            ("#   SELECT run_id, raw_location FROM dataset_release WHERE dataset='{0}'" +
             " AND period_code='{1}' ORDER BY acquired_at DESC;") -f $entry.Name, $firstPeriod
        }

        # -ReplayPublish rewrites the runs that follow this slot's first API fetch into replays of
        # it. $fetchRunId is the run that paid for the pages; the operator reads its raw_location.
        # A slot already sourced from ARCHIVE fetches nothing, so the switch changes nothing there.
        $fetchRunId = $null
        $dryRunSource = $source
        $dryRunFile = $sourceFile
        $publishSource = $source
        $publishFile = $sourceFile

        if ($null -eq $knownRows) {
            $probeRunId = Get-RunId $entry.Name $periodCode $attemptNumber
            '# Probe: expected-rows is unknown for this quarter, so this run fails on purpose and'
            '# reports expected/input/accepted/rejected/duplicate/unmapped. Use accepted as the real count.'
            Format-ImportCommand -DatasetName $entry.Name -PeriodCode $periodCode `
                -RunId $probeRunId -Source $source -SourceFile $sourceFile `
                -ExpectedRows '1' -SourceUpdatedAt $sourceUpdatedAt -DryRun $true
            $attemptNumber++
            $expectedRows = 'REPLACE_WITH_PROBE_COUNT'

            # The probe already fetched and archived the pages, so both later runs can replay it.
            if ($ReplayPublish -and $source -eq 'API') {
                $fetchRunId = $probeRunId
                $dryRunSource = 'ARCHIVE'; $dryRunFile = 'REPLACE_WITH_RAW_LOCATION'
                $publishSource = 'ARCHIVE'; $publishFile = 'REPLACE_WITH_RAW_LOCATION'
            }
        }
        else {
            $expectedRows = [string]$knownRows
        }

        $dryRunId = Get-RunId $entry.Name $periodCode $attemptNumber
        if ($fetchRunId) {
            "# Replace REPLACE_WITH_RAW_LOCATION below using the probe run:"
            "#   SELECT raw_location FROM dataset_release WHERE run_id='{0}';" -f $fetchRunId
        }
        '# Dry-run, then publish only if it logs COMPLETED.'
        Format-ImportCommand -DatasetName $entry.Name -PeriodCode $periodCode `
            -RunId $dryRunId -Source $dryRunSource -SourceFile $dryRunFile `
            -ExpectedRows $expectedRows -SourceUpdatedAt $sourceUpdatedAt -DryRun $true
        $attemptNumber++

        # No probe ran, so the dry-run is what fetched. Publish replays it.
        if ($ReplayPublish -and $publishSource -eq 'API') {
            $fetchRunId = $dryRunId
            $publishSource = 'ARCHIVE'; $publishFile = 'REPLACE_WITH_RAW_LOCATION'
            "# Replace REPLACE_WITH_RAW_LOCATION below using the dry-run above:"
            "#   SELECT raw_location FROM dataset_release WHERE run_id='{0}';" -f $dryRunId
        }
        Format-ImportCommand -DatasetName $entry.Name -PeriodCode $periodCode `
            -RunId (Get-RunId $entry.Name $periodCode $attemptNumber) -Source $publishSource -SourceFile $publishFile `
            -ExpectedRows $expectedRows -SourceUpdatedAt $sourceUpdatedAt -DryRun $false
    }
}

''
'# Done. Confirm with backend/scripts/migration/quarterly-import-coverage.sql,'
'# then move the releases into the fact tables with -Job project.'
