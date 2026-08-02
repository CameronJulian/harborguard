param(
    [Parameter(Mandatory = $true)]
    [string]$AccessToken,

    [string]$BaseUrl = "http://localhost:3000",

    [string]$OutputDirectory =
        ".\_audit-output\traffic-model-validation",

    [int]$DelayBetweenRoutesSeconds = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$routes = @(
    [PSCustomObject]@{
        Name = "Ottery to Bishop Lavis"
        OriginLatitude = -34.0008
        OriginLongitude = 18.5054
        DestinationLatitude = -33.9470
        DestinationLongitude = 18.5750
    }

    [PSCustomObject]@{
        Name = "Bellville to Cape Town CBD"
        OriginLatitude = -33.9002
        OriginLongitude = 18.6293
        DestinationLatitude = -33.9249
        DestinationLongitude = 18.4241
    }

    [PSCustomObject]@{
        Name = "Cape Town Airport to Somerset West"
        OriginLatitude = -33.9715
        OriginLongitude = 18.6021
        DestinationLatitude = -34.0757
        DestinationLongitude = 18.8433
    }

    [PSCustomObject]@{
        Name = "Parow to Mitchells Plain"
        OriginLatitude = -33.9067
        OriginLongitude = 18.5814
        DestinationLatitude = -34.0500
        DestinationLongitude = 18.6187
    }

    [PSCustomObject]@{
        Name = "Durbanville to Century City"
        OriginLatitude = -33.8333
        OriginLongitude = 18.6470
        DestinationLatitude = -33.8935
        DestinationLongitude = 18.5058
    }

    [PSCustomObject]@{
        Name = "Goodwood to Khayelitsha"
        OriginLatitude = -33.9044
        OriginLongitude = 18.5551
        DestinationLatitude = -34.0380
        DestinationLongitude = 18.6770
    }
)

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
    throw "AccessToken cannot be empty."
}

if ($DelayBetweenRoutesSeconds -lt 0) {
    throw "DelayBetweenRoutesSeconds cannot be negative."
}

if ($routes.Count -eq 0) {
    throw "No validation routes are configured."
}

$duplicateRouteNames =
    $routes |
    Group-Object Name |
    Where-Object Count -gt 1

if ($duplicateRouteNames) {
    throw "Duplicate validation route names were detected."
}

Write-Host ""
Write-Host "HarborGuard Traffic Model Validation"
Write-Host "Routes configured: $($routes.Count)"
Write-Host "Base URL: $BaseUrl"
Write-Host "Output directory: $OutputDirectory"
Write-Host ""

$routes |
Select-Object `
    Name,
    OriginLatitude,
    OriginLongitude,
    DestinationLatitude,
    DestinationLongitude |
Format-Table -AutoSize

$AccessToken =
    $AccessToken.Trim().Trim('"') -replace "`r|`n", ""

if (($AccessToken -split '\.').Count -ne 3) {
    throw "AccessToken does not appear to be a valid JWT."
}

$normalizedBaseUrl =
    $BaseUrl.TrimEnd("/")

$repositoryRoot =
    Split-Path -Parent $PSScriptRoot

if (
    [System.IO.Path]::IsPathRooted(
        $OutputDirectory
    )
) {
    $resolvedOutputDirectory =
        [System.IO.Path]::GetFullPath(
            $OutputDirectory
        )
}
else {
    $repositoryRelativeOutputPath =
        Join-Path `
            -Path $repositoryRoot `
            -ChildPath $OutputDirectory

    $resolvedOutputDirectory =
        [System.IO.Path]::GetFullPath(
            $repositoryRelativeOutputPath
        )
}

New-Item `
    -ItemType Directory `
    -Path $resolvedOutputDirectory `
    -Force |
Out-Null

$runTimestamp =
    Get-Date -Format "yyyyMMdd-HHmmss"

$jsonOutputPath =
    Join-Path `
        $resolvedOutputDirectory `
        "traffic-model-validation-$runTimestamp.json"

$csvOutputPath =
    Join-Path `
        $resolvedOutputDirectory `
        "traffic-model-validation-$runTimestamp.csv"

$headers = @{
    Authorization  = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

Write-Host "JSON output: $jsonOutputPath"
Write-Host "CSV output:  $csvOutputPath"
Write-Host ""

function Invoke-HarborGuardRoutePrediction {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [PSCustomObject]$Route,

        [Parameter(Mandatory = $true)]
        [hashtable]$RequestHeaders,

        [Parameter(Mandatory = $true)]
        [string]$ApiBaseUrl
    )

    $requestBody = @{
        origin = @{
            lat = $Route.OriginLatitude
            lng = $Route.OriginLongitude
        }

        destination = @{
            lat = $Route.DestinationLatitude
            lng = $Route.DestinationLongitude
        }
    } |
    ConvertTo-Json -Depth 5

    $requestStartedAt =
        (Get-Date).ToUniversalTime()

    try {
        $response = Invoke-RestMethod `
            -Uri "$ApiBaseUrl/api/route-safety/predict" `
            -Method Post `
            -Headers $RequestHeaders `
            -Body $requestBody `
            -ErrorAction Stop

        $requestFinishedAt =
            (Get-Date).ToUniversalTime()

        return [PSCustomObject]@{
            RouteName = $Route.Name
            Success = $true
            StartedAt = $requestStartedAt.ToString("o")
            FinishedAt = $requestFinishedAt.ToString("o")
            DurationSeconds = [math]::Round(
                (
                    $requestFinishedAt -
                    $requestStartedAt
                ).TotalSeconds,
                2
            )
            Response = $response
            Error = $null
        }
    }
    catch {
        $requestFinishedAt =
            (Get-Date).ToUniversalTime()

        return [PSCustomObject]@{
            RouteName = $Route.Name
            Success = $false
            StartedAt = $requestStartedAt.ToString("o")
            FinishedAt = $requestFinishedAt.ToString("o")
            DurationSeconds = [math]::Round(
                (
                    $requestFinishedAt -
                    $requestStartedAt
                ).TotalSeconds,
                2
            )
            Response = $null
            Error = $_.Exception.Message
        }
    }
}

Write-Host "Running full route validation harness..."
Write-Host ""

$validationResults =
    [System.Collections.Generic.List[object]]::new()

$rawResults =
    [System.Collections.Generic.List[object]]::new()

for ($routeIndex = 0; $routeIndex -lt $routes.Count; $routeIndex++) {
    $route = $routes[$routeIndex]

    Write-Host (
        "[$($routeIndex + 1)/$($routes.Count)] " +
        $route.Name
    )

    $routeResult =
        Invoke-HarborGuardRoutePrediction `
            -Route $route `
            -RequestHeaders $headers `
            -ApiBaseUrl $normalizedBaseUrl

    $rawResults.Add($routeResult)

    if (-not $routeResult.Success) {
        $failureSummary =
            [PSCustomObject]@{
                RouteName = $route.Name
                Success = $false
                StartedAt = $routeResult.StartedAt
                FinishedAt = $routeResult.FinishedAt
                RequestDurationSeconds =
                    $routeResult.DurationSeconds
                OriginLatitude =
                    $route.OriginLatitude
                OriginLongitude =
                    $route.OriginLongitude
                DestinationLatitude =
                    $route.DestinationLatitude
                DestinationLongitude =
                    $route.DestinationLongitude
                Error = $routeResult.Error
            }

        $validationResults.Add($failureSummary)

        Write-Warning (
            "Route validation failed: " +
            $routeResult.Error
        )
    }
    else {
        $response = $routeResult.Response
        $sampling =
            $response.diagnosticRouteTrafficSampling
        $model =
            $response.experimentalTrafficModel

        $summary =
            [PSCustomObject]@{
                RouteName = $route.Name
                Success = $true
                StartedAt = $routeResult.StartedAt
                FinishedAt = $routeResult.FinishedAt
                RequestDurationSeconds =
                    $routeResult.DurationSeconds
                OriginLatitude =
                    $route.OriginLatitude
                OriginLongitude =
                    $route.OriginLongitude
                DestinationLatitude =
                    $route.DestinationLatitude
                DestinationLongitude =
                    $route.DestinationLongitude
                DistanceMeters =
                    $response.routeEstimate.distanceMeters
                Duration =
                    $response.routeEstimate.duration
                ProductionTrafficScore =
                    $response.trafficRiskScore
                ProductionTrafficLevel =
                    $response.trafficRiskLevel
                ProductionTrafficContribution =
                    $response.trafficContribution
                MidpointFlowCorridors =
                    $response.traffic.summary.flowCorridors
                MidpointCongestion =
                    $response.traffic.summary.averageCongestion
                MidpointDelayMinutes =
                    $response.traffic.summary.averageDelay
                RouteSampleCount =
                    $sampling.sampleCount
                SuccessfulSamples =
                    $sampling.successfulSamples
                FailedSamples =
                    $sampling.failedSamples
                RouteAverageCongestion =
                    $sampling.averageCongestion
                RouteP75Congestion =
                    $sampling.p75Congestion
                RouteMaximumCongestion =
                    $sampling.maximumCongestion
                RouteAverageDelayMinutes =
                    $sampling.averageDelayMinutes
                RouteMaximumDelayMinutes =
                    $sampling.maximumDelayMinutes
                CongestionDifference =
                    $sampling.congestionDifference
                CongestionReductionPercent =
                    $sampling.congestionReductionPercent
                ExperimentalModel =
                    $model.model
                ExperimentalScore =
                    $model.score
                ExperimentalLevel =
                    $model.level
                ProductionApplied =
                    $model.productionApplied
                RouteComponentScore =
                    $model.inputs.routeScore
                TypeSeverityComponentScore =
                    $model.inputs.typeSeverityScore
                ProviderComponentScore =
                    $model.inputs.providerScore
                ScoreDifference =
                    $model.score -
                    $response.trafficRiskScore
                LevelChanged =
                    (
                        [string]$model.level
                    ).ToLowerInvariant() -ne
                    (
                        [string]$response.trafficRiskLevel
                    ).ToLowerInvariant()
                TrafficError =
                    $response.trafficError
                Error = $null
            }

        $validationResults.Add($summary)

        Write-Host (
            "  Production: " +
            "$($summary.ProductionTrafficScore) / " +
            "$($summary.ProductionTrafficLevel)"
        )

        Write-Host (
            "  Experimental: " +
            "$($summary.ExperimentalScore) / " +
            "$($summary.ExperimentalLevel)"
        )

        Write-Host (
            "  Difference: " +
            $summary.ScoreDifference
        )
    }

    if (
        $routeIndex -lt ($routes.Count - 1) -and
        $DelayBetweenRoutesSeconds -gt 0
    ) {
        Start-Sleep `
            -Seconds $DelayBetweenRoutesSeconds
    }

    Write-Host ""
}

$runSummary =
    [PSCustomObject]@{
        GeneratedAt =
            (Get-Date).ToUniversalTime().ToString("o")
        BaseUrl = $normalizedBaseUrl
        RouteCount = $routes.Count
        SuccessfulRoutes =
            @(
                $validationResults |
                Where-Object Success
            ).Count
        FailedRoutes =
            @(
                $validationResults |
                Where-Object { -not $_.Success }
            ).Count
        Results = $validationResults
    }

$runSummary |
ConvertTo-Json -Depth 20 |
Set-Content `
    -Path $jsonOutputPath `
    -Encoding utf8

$validationResults |
Export-Csv `
    -Path $csvOutputPath `
    -NoTypeInformation `
    -Encoding utf8

Write-Host "Validation complete."
Write-Host "Successful routes: $($runSummary.SuccessfulRoutes)"
Write-Host "Failed routes: $($runSummary.FailedRoutes)"
Write-Host "JSON output: $jsonOutputPath"
Write-Host "CSV output:  $csvOutputPath"
Write-Host ""

$validationResults |
Select-Object `
    RouteName,
    Success,
    ProductionTrafficScore,
    ProductionTrafficLevel,
    ExperimentalScore,
    ExperimentalLevel,
    ScoreDifference,
    LevelChanged,
    FailedSamples,
    Error |
Format-Table -AutoSize
