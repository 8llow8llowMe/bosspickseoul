package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.presenter;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationResponse;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.info.PolicyRecommendationInfo;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.enums.PolicySupportType;
import com.followfollowme.bosspickseoul.domainlayer.policy.domain.model.Policy;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 식별자가 실제 JSON 에서 문자열로 나가는지 검증한다.
 *
 * <p>필드 타입만 String 으로 바꿔두면 Presenter 에서 변환을 빼먹어도 컴파일은 되지만, 잘못된 값이
 * 나가는 게 아니라 <b>맞는 값이 잘못된 형식으로</b> 나간다. 그건 서버 로그에 아무 흔적을 남기지 않고
 * 프론트에서 조용히 어긋나므로, wire format 자체를 못 박아 둔다.
 */
class PolicyPresenterSerializationTest {

    /** JavaScript Number.MAX_SAFE_INTEGER. 이 값을 넘는 정수는 JSON 파싱에서 뒷자리가 날아간다. */
    private static final long JS_MAX_SAFE_INTEGER = 9007199254740991L;

    private final PolicyPresenter policyPresenter = new PolicyPresenter();
    // 운영에서는 Boot 가 등록해 주는 모듈이라, 테스트에서만 직접 붙인다.
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("policyId 는 따옴표로 감싼 문자열로 직렬화된다")
    void policyIdIsSerializedAsQuotedString() throws Exception {
        String json = objectMapper.writeValueAsString(responseFor(9000000000000000001L));

        assertThat(json).contains("\"policyId\":\"9000000000000000001\"");
        assertThat(json).doesNotContain("\"policyId\":9000000000000000001");
    }

    @Test
    @DisplayName("MAX_SAFE_INTEGER 를 넘는 인접한 두 정책이 응답에서 구분된다")
    void adjacentIdsRemainDistinguishableOnTheWire() throws Exception {
        PolicyRecommendationInfo info = PolicyRecommendationInfo.of("11680", "CS1", List.of(
            policyWithId(9000000000000000001L),
            policyWithId(9000000000000000002L)
        ));

        PolicyRecommendationResponse response = policyPresenter.toRecommendationResponse(info);
        List<String> ids = response.policies().stream().map(item -> item.policyId()).toList();

        assertThat(9000000000000000001L).isGreaterThan(JS_MAX_SAFE_INTEGER);
        assertThat(ids).containsExactly("9000000000000000001", "9000000000000000002");
    }

    private PolicyRecommendationResponse responseFor(long policyId) {
        return policyPresenter.toRecommendationResponse(
            PolicyRecommendationInfo.of("11680", "CS1", List.of(policyWithId(policyId))));
    }

    private Policy policyWithId(long id) {
        return Policy.builder()
            .id(id)
            .title("소상공인 스마트기술 도입 지원")
            .organization("중소벤처기업부")
            .supportType(PolicySupportType.SUBSIDY)
            .targetSummary("스마트기기 도입 희망 소상공인")
            .supportContent("도입비의 70%, 최대 500만원 보조")
            .applyStartAt(LocalDate.of(2026, 3, 1))
            .applyEndAt(LocalDate.of(2026, 9, 30))
            .detailUrl("https://www.mss.go.kr")
            .build();
    }
}
