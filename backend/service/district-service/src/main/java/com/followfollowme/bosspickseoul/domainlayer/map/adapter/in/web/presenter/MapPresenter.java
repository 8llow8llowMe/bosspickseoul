package com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.AreaBoundaryItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.CandidateCommercialItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.CandidatePresetItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.CommercialProfileKeyMetricsItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.ComparePreviewMetricItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.ComparePreviewTargetItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.HeatmapAreaItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.MetricBreakdownItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidateCommercialsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CandidatePresetsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialHeatmapResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.MapAreaCoordsResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidatePresetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileAreaInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialProfileKeyMetricsInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.ComparePreviewMetricInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.ComparePreviewTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.MetricBreakdownInfo;
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

    public CommercialHeatmapResponse toCommercialHeatmapResponse(CommercialHeatmapResponseInfo responseInfo) {
        List<HeatmapAreaItem> areas = responseInfo.areas().stream()
            .map(areaInfo -> HeatmapAreaItem.builder()
                .areaCode(areaInfo.areaCode())
                .areaName(areaInfo.areaName())
                .centerLng(areaInfo.centerLng())
                .centerLat(areaInfo.centerLat())
                .boundaryCoords(areaInfo.boundaryCoords())
                .metricType(areaInfo.metricType())
                .score(areaInfo.score())
                .grade(areaInfo.grade())
                .summaryLabel(areaInfo.summaryLabel())
                .build())
            .toList();

        return CommercialHeatmapResponse.builder()
            .mode(responseInfo.mode())
            .serviceCode(responseInfo.serviceCode())
            .periodCode(responseInfo.periodCode())
            .metricType(responseInfo.metricType())
            .preset(responseInfo.preset())
            .priorityMetric(responseInfo.priorityMetric())
            .summary(responseInfo.summary())
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

    public CandidateCommercialsResponse toCandidateCommercialsResponse(CandidateCommercialsResponseInfo responseInfo) {
        List<CandidateCommercialItem> items = responseInfo.items().stream()
            .map(this::toCandidateCommercialItem)
            .toList();
        return CandidateCommercialsResponse.builder()
            .serviceCode(responseInfo.serviceCode())
            .periodCode(responseInfo.periodCode())
            .preset(responseInfo.preset())
            .priorityMetric(responseInfo.priorityMetric())
            .topN(responseInfo.topN())
            .summary(responseInfo.summary())
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
            .selectionReason(info.selectionReason())
            .opportunityLabel(info.opportunityLabel())
            .riskLabel(info.riskLabel())
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
            .insightOneLiner(info.insightOneLiner())
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
