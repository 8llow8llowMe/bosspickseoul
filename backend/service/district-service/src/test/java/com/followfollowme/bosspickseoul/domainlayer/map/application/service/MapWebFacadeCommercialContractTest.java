package com.followfollowme.bosspickseoul.domainlayer.map.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.item.CommercialProfileKeyMetricsItem;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialComparePreviewResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileKeyMetricsQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.ComparePreviewMetricQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.ComparePreviewTargetQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapCandidateQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapHeatmapQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapProfileQueryProcessor;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapQueryProcessor;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 지도가 commercial-service 의 상권 프로필·비교 프리뷰를 그대로 통과시키는 구간을 peer 계약 기준으로 못 박는다.
 *
 * <p><b>왜 필요한가.</b> 원천이 상권 단위 소득 제공을 중단해 peer 의 {@code keyMetrics} 에서 월 평균 소득이
 * 빠지고 비교 프리뷰의 {@code headlineMetrics} 도 6개에서 5개로 줄었다(이슈 #413). 통과 경로가 지표 개수나
 * 순서를 가정하면 peer 계약이 바뀔 때마다 조용히 깨진다. 개수에 의존하지 않고 받은 만큼 옮기는지 확인한다.
 */
@ExtendWith(MockitoExtension.class)
class MapWebFacadeCommercialContractTest {

    @Mock
    private MapQueryProcessor mapQueryProcessor;

    @Mock
    private MapHeatmapQueryProcessor mapHeatmapQueryProcessor;

    @Mock
    private MapCandidateQueryProcessor mapCandidateQueryProcessor;

    @Mock
    private CommercialProfileQueryPort commercialProfileQueryPort;

    private MapWebFacade facade() {
        return new MapWebFacade(
            mapQueryProcessor,
            mapHeatmapQueryProcessor,
            mapCandidateQueryProcessor,
            new MapProfileQueryProcessor(commercialProfileQueryPort),
            new MapPresenter()
        );
    }

    @Test
    @DisplayName("프로필 핵심 지표 8개가 소득 없이 그대로 통과한다")
    void passesThroughKeyMetricsWithoutIncome() {
        CommercialProfileKeyMetricsQueryResult keyMetrics = new CommercialProfileKeyMetricsQueryResult(
            1_000_000D, 2_000D, 30L, 4L, 5.5D, 6.5D, 700L, 8L
        );
        when(commercialProfileQueryPort.getCommercialProfile(anyString(), anyString(), anyString()))
            .thenReturn(new CommercialProfileQueryResult(
                "3110008", "역삼역", "11680", "강남구", "1168064000", "역삼1동", keyMetrics, List.of()
            ));

        CommercialProfileResponse response = facade().getCommercialProfile("3110008", "CS100001", "20261");

        CommercialProfileKeyMetricsItem item = response.keyMetrics();
        assertThat(item).isNotNull();
        assertThat(item.totalSalesAmount()).isEqualTo(1_000_000D);
        assertThat(item.totalFootTraffic()).isEqualTo(2_000D);
        assertThat(item.totalStoreCount()).isEqualTo(30L);
        assertThat(item.similarStoreCount()).isEqualTo(4L);
        assertThat(item.openingRate()).isEqualTo(5.5D);
        assertThat(item.closureRate()).isEqualTo(6.5D);
        assertThat(item.totalResidentPopulation()).isEqualTo(700L);
        assertThat(item.totalFacilityCount()).isEqualTo(8L);
        // 소득이 계약에서 빠졌으므로 응답 DTO 에도 해당 컴포넌트가 남아 있으면 안 된다.
        assertThat(CommercialProfileKeyMetricsItem.class.getRecordComponents()).hasSize(8);
    }

    @Test
    @DisplayName("비교 프리뷰 핵심 지표는 peer 가 준 개수 그대로 통과한다")
    void passesThroughHeadlineMetricsAsGiven() {
        List<ComparePreviewMetricQueryResult> headlineMetrics = List.of(
            metric("총 매출액"), metric("총 유동인구"), metric("총 점포 수"), metric("개업률"), metric("폐업률")
        );
        when(commercialProfileQueryPort.getCommercialComparePreview(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(new CommercialComparePreviewQueryResult(
                target("3110008", "역삼역"),
                target("3110009", "명동역"),
                CodeNameDescriptionMetadata.of("LEFT", "좌측", "좌측 상권이 우세합니다."),
                headlineMetrics,
                "역삼역이 매출 기준 32% 우위입니다."
            ));

        CommercialComparePreviewResponse response =
            facade().getCommercialComparePreview("3110008", "3110009", "CS100001", "20261");

        // 소비 지표가 빠져 5개가 됐다. 고정 개수나 인덱스에 기대면 여기서 깨진다.
        assertThat(response.headlineMetrics()).hasSize(5);
        assertThat(response.headlineMetrics().stream().map(metricItem -> metricItem.label()).toList())
            .containsExactly("총 매출액", "총 유동인구", "총 점포 수", "개업률", "폐업률");
        assertThat(response.insightOneLiner()).isEqualTo("역삼역이 매출 기준 32% 우위입니다.");
    }

    @Test
    @DisplayName("peer 가 핵심 지표를 주지 않으면 keyMetrics 는 null 로 내려간다")
    void nullKeyMetricsStaysNull() {
        when(commercialProfileQueryPort.getCommercialProfile(anyString(), anyString(), anyString()))
            .thenReturn(new CommercialProfileQueryResult(
                "3110008", "역삼역", "11680", "강남구", "1168064000", "역삼1동", null, List.of()
            ));

        CommercialProfileResponse response = facade().getCommercialProfile("3110008", "CS100001", "20261");

        assertThat(response.keyMetrics()).isNull();
    }

    private static ComparePreviewMetricQueryResult metric(String label) {
        return new ComparePreviewMetricQueryResult(
            label, 100D, 80D, 20D, 25D, CodeNameDescriptionMetadata.of("LEFT", "좌측", "좌측 상권이 우세합니다.")
        );
    }

    private static ComparePreviewTargetQueryResult target(String commercialCode, String commercialName) {
        return new ComparePreviewTargetQueryResult(
            commercialCode, commercialName, "11680", "강남구", "1168064000", "역삼1동"
        );
    }
}
