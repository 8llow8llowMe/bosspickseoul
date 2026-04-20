package com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.AreaBoundaryItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.CandidateCommercialItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.CandidatePresetItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.CommercialProfileKeyMetricsItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.ComparePreviewMetricItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.ComparePreviewTargetItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.HeatmapAreaItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.item.MetricBreakdownItem;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.nowdoboss.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CandidateCommercialAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialComparePreviewInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialHeatmapAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialProfileAreaInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.CommercialProfileKeyMetricsInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.ComparePreviewMetricInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.ComparePreviewTargetInfo;
import com.followfollowme.nowdoboss.domainlayer.map.application.info.MetricBreakdownInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MapPresenter {

    public MapAreaCoordsResponse toMapAreaCoordsResponse(List<AreaBoundaryInfo> infos) {
        List<AreaBoundaryItem> areas = infos.stream()
            .map(info -> AreaBoundaryItem.builder()
                .areaCode(info.areaCode())
                .areaName(info.areaName())
                .centerLng(info.centerLng())
                .centerLat(info.centerLat())
                .boundaryCoords(info.boundaryCoords())
                .build())
            .toList();

        return MapAreaCoordsResponse.builder()
            .areas(areas)
            .build();
    }

    public CommercialHeatmapResponse toCommercialHeatmapResponse(List<CommercialHeatmapAreaInfo> infos) {
        List<HeatmapAreaItem> areas = infos.stream()
            .map(info -> HeatmapAreaItem.builder()
                .areaCode(info.areaCode())
                .areaName(info.areaName())
                .centerLng(info.centerLng())
                .centerLat(info.centerLat())
                .boundaryCoords(info.boundaryCoords())
                .metricType(info.metricType())
                .score(info.score())
                .grade(info.grade())
                .summaryLabel(info.summaryLabel())
                .build())
            .toList();

        return CommercialHeatmapResponse.builder()
            .areas(areas)
            .build();
    }

    public CandidatePresetsResponse toCandidatePresetsResponse(List<CandidatePresetInfo> infos) {
        List<CandidatePresetItem> items = infos.stream()
            .map(info -> CandidatePresetItem.builder()
                .preset(info.preset())
                .defaultPriorityMetric(info.defaultPriorityMetric())
                .build())
            .toList();
        return CandidatePresetsResponse.builder()
            .presets(items)
            .build();
    }

    public CandidateCommercialsResponse toCandidateCommercialsResponse(List<CandidateCommercialAreaInfo> infos) {
        List<CandidateCommercialItem> items = infos.stream()
            .map(this::toCandidateCommercialItem)
            .toList();
        return CandidateCommercialsResponse.builder()
            .items(items)
            .build();
    }

    private CandidateCommercialItem toCandidateCommercialItem(CandidateCommercialAreaInfo info) {
        return CandidateCommercialItem.builder()
            .rank(info.rank())
            .areaCode(info.areaCode())
            .areaName(info.areaName())
            .centerLng(info.centerLng())
            .centerLat(info.centerLat())
            .boundaryCoords(info.boundaryCoords())
            .compositeScore(info.compositeScore())
            .grade(info.grade())
            .summaryLabel(info.summaryLabel())
            .metricBreakdown(info.metricBreakdown().stream().map(this::toMetricBreakdownItem).toList())
            .reasonTags(info.reasonTags())
            .build();
    }

    private MetricBreakdownItem toMetricBreakdownItem(MetricBreakdownInfo info) {
        return MetricBreakdownItem.builder()
            .metricType(info.metricType())
            .score(info.score())
            .grade(info.grade())
            .summaryLabel(info.summaryLabel())
            .build();
    }

    public CommercialProfileResponse toCommercialProfileResponse(CommercialProfileAreaInfo info) {
        return CommercialProfileResponse.builder()
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .centerLng(info.centerLng())
            .centerLat(info.centerLat())
            .boundaryCoords(info.boundaryCoords())
            .keyMetrics(toCommercialProfileKeyMetricsItem(info.keyMetrics()))
            .build();
    }

    public CommercialComparePreviewResponse toCommercialComparePreviewResponse(CommercialComparePreviewInfo info) {
        return CommercialComparePreviewResponse.builder()
            .left(toComparePreviewTargetItem(info.left()))
            .right(toComparePreviewTargetItem(info.right()))
            .recommendedSide(info.recommendedSide())
            .headlineMetrics(info.headlineMetrics().stream().map(this::toComparePreviewMetricItem).toList())
            .build();
    }

    private CommercialProfileKeyMetricsItem toCommercialProfileKeyMetricsItem(CommercialProfileKeyMetricsInfo info) {
        if (info == null) {
            return null;
        }
        return CommercialProfileKeyMetricsItem.builder()
            .totalSalesAmount(info.totalSalesAmount())
            .totalFootTraffic(info.totalFootTraffic())
            .totalStoreCount(info.totalStoreCount())
            .similarStoreCount(info.similarStoreCount())
            .openingRate(info.openingRate())
            .closureRate(info.closureRate())
            .totalResidentPopulation(info.totalResidentPopulation())
            .monthlyAverageIncomeAmount(info.monthlyAverageIncomeAmount())
            .totalFacilityCount(info.totalFacilityCount())
            .build();
    }

    private ComparePreviewTargetItem toComparePreviewTargetItem(ComparePreviewTargetInfo info) {
        if (info == null) {
            return null;
        }
        return ComparePreviewTargetItem.builder()
            .commercialCode(info.commercialCode())
            .commercialName(info.commercialName())
            .districtCode(info.districtCode())
            .districtName(info.districtName())
            .administrationCode(info.administrationCode())
            .administrationName(info.administrationName())
            .build();
    }

    private ComparePreviewMetricItem toComparePreviewMetricItem(ComparePreviewMetricInfo info) {
        return ComparePreviewMetricItem.builder()
            .label(info.label())
            .leftValue(info.leftValue())
            .rightValue(info.rightValue())
            .diffValue(info.diffValue())
            .diffRate(info.diffRate())
            .winnerSide(info.winnerSide())
            .build();
    }
}
