package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.comparison.CommercialComparisonTargetInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.preview.CommercialComparePreviewInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.info.trend.CommercialTrendInfo;
import com.followfollowme.bosspickseoul.domainlayer.commercial.application.model.CommercialTrendMetricType;
import com.followfollowme.bosspickseoul.domainlayer.district.domain.enums.PeriodTrendType;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter.PolicyPresenter;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 분석 응답이 실제로 조회한 분기를 최상위 {@code periodCode} 로 내리는지 확인한다(이슈 #464).
 *
 * <p>분기를 생략하면 서버가 기본 분기를 정하므로, 응답에 그 값이 없으면 화면·공유 링크·AI 리포트가 어느 분기를 봤는지 모른다.
 * Presenter 는 {@code @InjectMocks} 로 만든다 — 생성자 인자가 늘어도 이 테스트가 같이 고쳐질 필요가 없게 한다.
 */
@ExtendWith(MockitoExtension.class)
class CommercialPresenterPeriodCodeTest {

    @Mock
    private PolicyPresenter policyPresenter;

    @Spy
    private CommercialExpenseProvenancePresenter commercialExpenseProvenancePresenter;

    @InjectMocks
    private CommercialPresenter presenter;

    @Test
    @DisplayName("비교 프리뷰 응답은 비교에 쓴 분기를 싣는다")
    void comparePreviewCarriesThePeriod() {
        CommercialComparePreviewInfo info = CommercialComparePreviewInfo.builder()
            .periodCode("20261")
            .left(CommercialComparisonTargetInfo.builder().commercialCode("3110008").commercialName("왼쪽").build())
            .right(CommercialComparisonTargetInfo.builder().commercialCode("3110012").commercialName("오른쪽").build())
            .headlineMetrics(List.of())
            .insightOneLiner("요약")
            .build();

        assertThat(presenter.toCommercialComparePreviewResponse(info).periodCode()).isEqualTo("20261");
    }

    @Test
    @DisplayName("트렌드 응답은 추이의 기준(최신) 분기를 싣는다")
    void trendCarriesItsLatestPeriod() {
        CommercialTrendInfo info = CommercialTrendInfo.builder()
            .periodCode("20261")
            .commercialCode("3110008")
            .serviceCode("CS100001")
            .metricType(CommercialTrendMetricType.SALES)
            .trendDirection(PeriodTrendType.STAGNANT)
            .periods(List.of())
            .build();

        assertThat(presenter.toCommercialTrendResponse(info).periodCode()).isEqualTo("20261");
    }
}
