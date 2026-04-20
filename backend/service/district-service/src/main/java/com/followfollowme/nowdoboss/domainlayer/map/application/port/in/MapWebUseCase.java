package com.followfollowme.nowdoboss.domainlayer.map.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.nowdoboss.domainlayer.map.application.model.CommercialHeatmapMetricType;

public interface MapWebUseCase {

    MapAreaCoordsResponse getCommercialAreaCoords(double lngSW, double latSW, double lngNE, double latNE);

    MapAreaCoordsResponse getAdministrationAreaCoords(double lngSW, double latSW, double lngNE, double latNE);

    MapAreaCoordsResponse getDistrictAreaCoords(double lngSW, double latSW, double lngNE, double latNE);

    CommercialHeatmapResponse getCommercialHeatmap(
        double lngSW,
        double latSW,
        double lngNE,
        double latNE,
        String serviceCode,
        String periodCode,
        CommercialHeatmapMetricType metricType,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric,
        boolean composite
    );

    CandidatePresetsResponse getCandidatePresets();

    CandidateCommercialsResponse getCandidateCommercials(
        double lngSW,
        double latSW,
        double lngNE,
        double latNE,
        String serviceCode,
        String periodCode,
        CandidatePresetType preset,
        CommercialHeatmapMetricType priorityMetric,
        Integer topN
    );

    CommercialProfileResponse getCommercialProfile(String commercialCode, String serviceCode, String periodCode);

    CommercialComparePreviewResponse getCommercialComparePreview(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    );
}
