param(
    [Parameter(Mandatory = $true)]
    [string]$AccessToken
)

$ErrorActionPreference = "Stop"

$AccessToken = $AccessToken.Trim().Trim('"') -replace "`r|`n", ""

if (
    -not $AccessToken.StartsWith("eyJ") -or
    ($AccessToken -split '\.').Count -ne 3
) {
    throw "The supplied access token is not a valid JWT."
}

$headers = @{
    Authorization  = "Bearer $AccessToken"
    "Content-Type" = "application/json"
}

$routes = @(
    [PSCustomObject]@{
        Name = "Ottery to Bishop Lavis"
        OriginLatitude = -34.0144
        OriginLongitude = 18.5067
        DestinationLatitude = -33.9465
        DestinationLongitude = 18.5751
    },
    [PSCustomObject]@{
        Name = "Bishop Lavis to Ottery"
        OriginLatitude = -33.9465
        OriginLongitude = 18.5751
        DestinationLatitude = -34.0144
        DestinationLongitude = 18.5067
    },
    [PSCustomObject]@{
        Name = "Cape Town CBD to Airport"
        OriginLatitude = -33.9249
        OriginLongitude = 18.4241
        DestinationLatitude = -33.9715
        DestinationLongitude = 18.6021
    },
    [PSCustomObject]@{
        Name = "Bellville to Mitchells Plain"
        OriginLatitude = -33.9002
        OriginLongitude = 18.6299
        DestinationLatitude = -34.0507
        DestinationLongitude = 18.6187
    },
    [PSCustomObject]@{
        Name = "Claremont to Century City"
        OriginLatitude = -33.9847
        OriginLongitude = 18.4610
        DestinationLatitude = -33.8926
        DestinationLongitude = 18.5040
    },
    [PSCustomObject]@{
        Name = "Parow to Cape Town CBD"
        OriginLatitude = -33.9058
        OriginLongitude = 18.5867
        DestinationLatitude = -33.9249
        DestinationLongitude = 18.4241
    },
    [PSCustomObject]@{
        Name = "Goodwood to Wynberg"
        OriginLatitude = -33.9095
        OriginLongitude = 18.5494
        DestinationLatitude = -34.0048
        DestinationLongitude = 18.4681
    },
    [PSCustomObject]@{
        Name = "Kuils River to Cape Town CBD"
        OriginLatitude = -33.9288
        OriginLongitude = 18.6802
        DestinationLatitude = -33.9249
        DestinationLongitude = 18.4241
    },
    [PSCustomObject]@{
        Name = "Durbanville to Airport"
        OriginLatitude = -33.8338
        OriginLongitude = 18.6473
        DestinationLatitude = -33.9715
        DestinationLongitude = 18.6021
    },
    [PSCustomObject]@{
        Name = "Muizenberg to Century City"
        OriginLatitude = -34.1076
        OriginLongitude = 18.4709
        DestinationLatitude = -33.8926
        DestinationLongitude = 18.5040
    }
)

$results = foreach ($route in $routes) {
    $body = @{
        origin = @{
            lat = $route.OriginLatitude
            lng = $route.OriginLongitude
        }
        destination = @{
            lat = $route.DestinationLatitude
            lng = $route.DestinationLongitude
        }
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod `
            -Uri "http://localhost:3000/api/route-safety/predict" `
            -Method Post `
            -Headers $headers `
            -Body $body

        $summary = $response.traffic.summary

        [PSCustomObject]@{
            Route = $route.Name
            Success = $true
            ProductionRiskScore = $summary.riskScore
            ProductionRiskLevel = $summary.riskLevel
            ScopedIncidentCount = $summary.diagnosticScopedIncidents
            ScopedCriticalCount = $summary.diagnosticScopedCriticalIncidents
            BalancedRiskScore = $summary.diagnosticBalancedRiskScore
            ProviderWeightedScore =
                $summary.diagnosticProviderWeightedBalancedRiskScore
            AverageProviderWeight =
                $summary.diagnosticAverageProviderWeight
            AverageFreshnessWeight =
                $summary.diagnosticAverageFreshnessWeight
            StaleProviderIncidents =
                $summary.diagnosticStaleProviderIncidents
            AverageTypeSeverityWeight =
                $summary.diagnosticAverageTypeSeverityWeight
            TypeSeverityWeightedIncidents =
                $summary.diagnosticTypeSeverityWeightedIncidentCount
            TypeSeverityWeightedCritical =
                $summary.diagnosticTypeSeverityWeightedCriticalCount
            TypeSeverityWeightedScore =
                $summary.diagnosticTypeSeverityWeightedBalancedRiskScore
            TypeSeverityWeightedLevel =
                $summary.diagnosticTypeSeverityWeightedBalancedRiskLevel
            MidpointAverageCongestion =
                $response.diagnosticRouteTrafficSampling.midpointAverageCongestion
            RouteAverageCongestion =
                $response.diagnosticRouteTrafficSampling.routeAverageCongestion
            RouteP75Congestion =
                $response.diagnosticRouteTrafficSampling.routeP75Congestion
            RouteMaximumCongestion =
                $response.diagnosticRouteTrafficSampling.routeMaximumCongestion
            CongestionDifference =
                $response.diagnosticRouteTrafficSampling.congestionDifference
            CongestionReductionPercent =
                $response.diagnosticRouteTrafficSampling.congestionReductionPercent
            RouteCandidateTrafficScore =
                $response.diagnosticRouteTrafficSampling.diagnosticRouteCandidateTrafficRiskScore
            RouteCandidateTrafficLevel =
                $response.diagnosticRouteTrafficSampling.diagnosticRouteCandidateTrafficRiskLevel
            RouteCandidateCongestionInput =
                $response.diagnosticRouteTrafficSampling.diagnosticRouteCandidateCongestionInput
            RouteCandidateIncidentInput =
                $response.diagnosticRouteTrafficSampling.diagnosticRouteCandidateIncidentInput
            RouteCandidateCriticalInput =
                $response.diagnosticRouteTrafficSampling.diagnosticRouteCandidateCriticalInput
            CompositeCandidateScore =
                $response.diagnosticRouteTrafficSampling.diagnosticCompositeCandidateScore
            CompositeCandidateLevel =
                $response.diagnosticRouteTrafficSampling.diagnosticCompositeCandidateLevel
            CompositeRouteScore =
                $response.diagnosticRouteTrafficSampling.diagnosticCompositeRouteScore
            CompositeTypeSeverityScore =
                $response.diagnosticRouteTrafficSampling.diagnosticCompositeTypeSeverityScore
            CompositeProviderScore =
                $response.diagnosticRouteTrafficSampling.diagnosticCompositeProviderScore
            AverageCongestion = $summary.averageCongestion
            AverageDelay = $summary.averageDelay
            Error = $null
        }
    }
    catch {
        [PSCustomObject]@{
            Route = $route.Name
            Success = $false
            ProductionRiskScore = $null
            ProductionRiskLevel = $null
            ScopedIncidentCount = $null
            ScopedCriticalCount = $null
            BalancedRiskScore = $null
            ProviderWeightedScore = $null
            AverageProviderWeight = $null
            AverageFreshnessWeight = $null
            StaleProviderIncidents = $null
            AverageTypeSeverityWeight = $null
            TypeSeverityWeightedIncidents = $null
            TypeSeverityWeightedCritical = $null
            TypeSeverityWeightedScore = $null
            TypeSeverityWeightedLevel = $null
            MidpointAverageCongestion = $null
            RouteAverageCongestion = $null
            RouteP75Congestion = $null
            RouteMaximumCongestion = $null
            CongestionDifference = $null
            CongestionReductionPercent = $null
            RouteCandidateTrafficScore = $null
            RouteCandidateTrafficLevel = $null
            RouteCandidateCongestionInput = $null
            RouteCandidateIncidentInput = $null
            RouteCandidateCriticalInput = $null
            CompositeCandidateScore = $null
            CompositeCandidateLevel = $null
            CompositeRouteScore = $null
            CompositeTypeSeverityScore = $null
            CompositeProviderScore = $null
            AverageCongestion = $null
            AverageDelay = $null
            Error = $_.Exception.Message
        }
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath =
    ".\Traffic-Diagnostic-Calibration-$timestamp.csv"

$results |
Export-Csv `
    -Path $outputPath `
    -NoTypeInformation `
    -Encoding utf8

$results |
Format-Table `
    Route,
    Success,
    ProductionRiskScore,
    BalancedRiskScore,
    ProviderWeightedScore,
    TypeSeverityWeightedScore,
    TypeSeverityWeightedLevel,
    AverageCongestion `
    -AutoSize

""
"Calibration results exported to: $outputPath"
