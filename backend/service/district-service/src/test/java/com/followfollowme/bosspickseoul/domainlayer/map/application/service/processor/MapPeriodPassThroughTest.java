package com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.map.application.info.AreaBoundaryInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CandidateCommercialsResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.info.CommercialHeatmapResponseInfo;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CandidatePresetType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.model.CommercialHeatmapMetricType;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialHeatmapScoresQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.domain.enums.AreaType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 지도가 분기를 생략한 요청을 그대로(null) 상류로 넘기고, 응답 분기는 상류가 실제로 조회한 값을 쓰는지 확인한다(이슈 #464).
 *
 * <p>기본 분기는 commercial-service 한 곳에서만 정한다. 지도가 자기 상수로 채우면 두 서비스의 기본 분기가 갈린다.
 */
@ExtendWith(MockitoExtension.class)
class MapPeriodPassThroughTest {

    @Mock
    private MapQueryProcessor mapQueryProcessor;

    @Mock
    private CommercialHeatmapQueryPort commercialHeatmapQueryPort;

    @Mock
    private CommercialCandidateQueryPort commercialCandidateQueryPort;

    @Test
    @DisplayName("히트맵은 생략된 분기를 null 로 넘기고 상류가 조회한 분기를 응답에 싣는다")
    void heatmapTakesTheUpstreamPeriod() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of(boundary("3110008")));
        when(commercialHeatmapQueryPort.getHeatmapScores(eq(List.of("3110008")), eq("CS100001"), eq("OPPORTUNITY_SCORE"), isNull()))
            .thenReturn(CommercialHeatmapScoresQueryResult.builder().serviceCode("CS100001").periodCode("20261").scores(List.of()).build());

        CommercialHeatmapResponseInfo info = new MapHeatmapQueryProcessor(mapQueryProcessor, commercialHeatmapQueryPort)
            .getCommercialHeatmap(126.9, 37.45, 127.1, 37.7, "CS100001", null, CommercialHeatmapMetricType.OPPORTUNITY_SCORE, null, null, false);

        assertThat(info.periodCode()).isEqualTo("20261");
    }

    @Test
    @DisplayName("상류 응답이 없으면 요청 분기(생략이면 null)를 그대로 둔다")
    void heatmapWithoutUpstreamKeepsTheRequestedPeriod() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of(boundary("3110008")));

        CommercialHeatmapResponseInfo info = new MapHeatmapQueryProcessor(mapQueryProcessor, commercialHeatmapQueryPort)
            .getCommercialHeatmap(126.9, 37.45, 127.1, 37.7, "CS100001", null, CommercialHeatmapMetricType.OPPORTUNITY_SCORE, null, null, false);

        assertThat(info.periodCode()).isNull();
    }

    @Test
    @DisplayName("빈 뷰포트 후보는 상류를 부르지 않으므로 생략된 분기는 null 로 남는다")
    void emptyViewportCandidatesKeepTheOmittedPeriodAsNull() {
        when(mapQueryProcessor.getAreaCoords(eq(AreaType.COMMERCIAL), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
            .thenReturn(List.of());

        CandidateCommercialsResponseInfo info = new MapCandidateQueryProcessor(mapQueryProcessor, commercialCandidateQueryPort)
            .getCandidateCommercials(126.9, 37.45, 127.1, 37.7, "CS100001", null, CandidatePresetType.BALANCED, null, null);

        assertThat(info.periodCode()).isNull();
        assertThat(info.items()).isEmpty();
    }

    private static AreaBoundaryInfo boundary(String code) {
        return AreaBoundaryInfo.builder().areaCode(code).areaName("상권").centerLng(127.0).centerLat(37.5).boundaryCoords(List.of()).build();
    }
}
