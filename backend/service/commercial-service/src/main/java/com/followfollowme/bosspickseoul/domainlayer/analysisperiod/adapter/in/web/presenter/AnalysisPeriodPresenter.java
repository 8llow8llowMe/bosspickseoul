package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.presenter;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.item.AnalysisDatasetPeriodItem;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.response.AnalysisPeriodsResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.AnalysisPeriodCatalog;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.model.DatasetPeriodCoverage;
import org.springframework.stereotype.Component;

@Component
public class AnalysisPeriodPresenter {

    public AnalysisPeriodsResponse toAnalysisPeriodsResponse(AnalysisPeriodCatalog catalog) {
        return AnalysisPeriodsResponse.builder()
            .defaultPeriodCode(catalog.defaultPeriodCode())
            .availablePeriodCodes(catalog.availablePeriodCodes())
            .firstPeriodCode(catalog.firstPeriodCode())
            .spatialVersion(catalog.spatialVersion())
            .resolvedAt(catalog.resolvedAt())
            .datasets(catalog.datasets().stream().map(this::toAnalysisDatasetPeriodItem).toList())
            .build();
    }

    /** 게시 시각·스키마 버전은 dataset_release 미러가 생기면 채운다(후속 이슈). 그때까지 응답 모양만 미리 고정한다. */
    private AnalysisDatasetPeriodItem toAnalysisDatasetPeriodItem(DatasetPeriodCoverage coverage) {
        return AnalysisDatasetPeriodItem.builder()
            .dataset(coverage.dataset().name())
            .sourceId(coverage.dataset().openApiService())
            .latestPeriodCode(coverage.latestPeriodCode())
            .firstPeriodCode(coverage.firstPeriodCode())
            .periodCount(coverage.periodCount())
            .coreForDefault(coverage.coreForDefault())
            .lastPublishablePeriodCode(coverage.lastPublishablePeriodCode())
            .publishedAt(null)
            .schemaVersion(null)
            .build();
    }
}
