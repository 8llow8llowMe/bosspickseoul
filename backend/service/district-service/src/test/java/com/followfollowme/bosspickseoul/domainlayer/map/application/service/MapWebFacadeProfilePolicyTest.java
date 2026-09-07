package com.followfollowme.bosspickseoul.domainlayer.map.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.dto.response.CommercialProfileResponse;
import com.followfollowme.bosspickseoul.domainlayer.map.adapter.in.web.presenter.MapPresenter;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialCandidateQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialHeatmapQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.CommercialProfileQueryPort;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.port.out.query.PolicyQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.map.application.service.processor.MapQueryProcessor;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * 지도 상권 프로필이 지원 정책까지 함께 내려주는지 확인한다.
 *
 * <p>좌표는 지도 프로필에만, 정책은 상권 프로필에만 있어서 화면이 두 응답을 합쳐 쓰다가
 * 타입이 실제 응답과 어긋났다. 공개 계약 하나로 둘 다 받을 수 있어야 그 표류가 끝난다.
 */
@ExtendWith(MockitoExtension.class)
class MapWebFacadeProfilePolicyTest {

    @Mock
    private MapQueryProcessor mapQueryProcessor;

    @Mock
    private CommercialHeatmapQueryPort commercialHeatmapQueryPort;

    @Mock
    private CommercialCandidateQueryPort commercialCandidateQueryPort;

    @Mock
    private CommercialProfileQueryPort commercialProfileQueryPort;

    private MapWebFacade facade() {
        return new MapWebFacade(
            mapQueryProcessor,
            new MapPresenter(),
            commercialHeatmapQueryPort,
            commercialCandidateQueryPort,
            commercialProfileQueryPort
        );
    }

    @Test
    @DisplayName("상권 프로필의 지원 정책을 그대로 통과시킨다")
    void passesThroughPolicyRecommendations() {
        when(commercialProfileQueryPort.getCommercialProfile(anyString(), anyString(), anyString()))
            .thenReturn(profileWith(List.of(policy("7345678901234567890", "2026 소상공인 경영개선 자금"))));

        CommercialProfileResponse response = facade().getCommercialProfile("3110008", "CS100001", "20233");

        assertThat(response.policyRecommendations()).hasSize(1);
        assertThat(response.policyRecommendations().get(0).policyId()).isEqualTo("7345678901234567890");
        assertThat(response.policyRecommendations().get(0).title()).isEqualTo("2026 소상공인 경영개선 자금");
        assertThat(response.policyRecommendations().get(0).applyEndAt()).isEqualTo(LocalDate.of(2026, 12, 31));
    }

    @Test
    @DisplayName("매칭된 정책이 없으면 null 이 아니라 빈 배열로 내려간다")
    void emptyPolicyBecomesEmptyList() {
        when(commercialProfileQueryPort.getCommercialProfile(anyString(), anyString(), anyString()))
            .thenReturn(profileWith(null));

        CommercialProfileResponse response = facade().getCommercialProfile("3110008", "CS100001", "20233");

        assertThat(response.policyRecommendations()).isEmpty();
    }

    @Test
    @DisplayName("정책 목록에 섞인 null 항목은 걸러낸다")
    void skipsNullPolicyEntries() {
        when(commercialProfileQueryPort.getCommercialProfile(anyString(), anyString(), anyString()))
            .thenReturn(profileWith(Arrays.asList(policy("1", "정상"), null)));

        CommercialProfileResponse response = facade().getCommercialProfile("3110008", "CS100001", "20233");

        assertThat(response.policyRecommendations()).hasSize(1);
    }

    @Test
    @DisplayName("상권 프로필 응답 자체가 없으면 정책도 빈 배열이다")
    void nullProfileBecomesEmptyPolicyList() {
        when(commercialProfileQueryPort.getCommercialProfile(anyString(), anyString(), anyString()))
            .thenReturn(null);

        CommercialProfileResponse response = facade().getCommercialProfile("3110008", "CS100001", "20233");

        assertThat(response.policyRecommendations()).isEmpty();
    }

    private static CommercialProfileQueryResult profileWith(List<PolicyQueryResult> policies) {
        return new CommercialProfileQueryResult(
            "3110008", "역삼역", "11680", "강남구", "1168064000", "역삼1동", null, policies
        );
    }

    private static PolicyQueryResult policy(String policyId, String title) {
        return new PolicyQueryResult(
            policyId, title, "서울신용보증재단", "FUNDING", "자금",
            "서울시 소재 소상공인", "최대 5천만원", "11680", "CS1",
            LocalDate.of(2026, 3, 1), LocalDate.of(2026, 12, 31), "https://example.test/policy"
        );
    }
}
