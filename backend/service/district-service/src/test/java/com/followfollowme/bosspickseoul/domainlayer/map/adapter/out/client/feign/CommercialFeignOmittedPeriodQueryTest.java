package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign;

import static org.assertj.core.api.Assertions.assertThat;

import feign.Feign;
import feign.Request;
import feign.Response;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.openfeign.support.SpringMvcContract;

/**
 * 지도가 분기를 생략한 요청을 commercial-service 에 <b>periodCode 없이</b> 보내는지, 이 프로젝트의 OpenFeign 버전으로 못 박는다(이슈 #464).
 *
 * <p>Feign 은 null 인자를 템플릿 변수에서 빼고, 값이 없는 쿼리 템플릿은 통째로 지운다. 그래서 {@code periodCode=null} 이
 * 아니라 쿼리 자체가 빠지고, commercial-service 가 적재 기준 기본 분기로 해석한다. 이 동작이 바뀌어
 * {@code periodCode=} (빈 값) 이나 문자열 {@code "null"} 이 나가면 상류의 해석이 달라지므로 실제 계약({@link SpringMvcContract})으로
 * 요청 URL 을 만들어 확인한다. 응답 본문은 보지 않는다.
 */
class CommercialFeignOmittedPeriodQueryTest {

    private static final String TARGET = "http://commercial-service";

    private final List<String> requestedUrls = new ArrayList<>();

    @Test
    @DisplayName("프로필: 분기를 생략하면 periodCode 쿼리 자체가 빠진다")
    void profileOmitsANullPeriodCode() {
        client(CommercialProfileClient.class).getCommercialProfile("3110008", "CS100001", null);

        assertThat(requestedUrls).containsExactly(TARGET + "/api/v1/commercials/3110008/profile?serviceCode=CS100001");
    }

    @Test
    @DisplayName("비교 프리뷰·히트맵·후보도 분기를 생략하면 periodCode 를 보내지 않는다")
    void otherMapCallsOmitANullPeriodCode() {
        client(CommercialProfileClient.class).getCommercialComparePreview("3110008", "3110012", "CS100001", null);
        client(CommercialHeatmapClient.class).getHeatmapScores(List.of("3110008", "3110012"), "CS100001", "OPPORTUNITY_SCORE", null);
        client(CommercialHeatmapClient.class).getCompositeHeatmapScores(List.of("3110008"), "CS100001", "BALANCED", null, null);
        client(CommercialCandidateClient.class).getTopCandidates(List.of("3110008"), "CS100001", "BALANCED", null, null, null);

        assertThat(requestedUrls).hasSize(4).allSatisfy(url -> assertThat(url).doesNotContain("periodCode"));
        assertThat(requestedUrls.get(1)).contains("commercialCodes=3110008", "commercialCodes=3110012", "metricType=OPPORTUNITY_SCORE");
    }

    @Test
    @DisplayName("분기를 명시하면 그대로 보낸다")
    void explicitPeriodCodeIsSent() {
        client(CommercialProfileClient.class).getCommercialProfile("3110008", "CS100001", "20233");

        assertThat(requestedUrls).containsExactly(TARGET + "/api/v1/commercials/3110008/profile?serviceCode=CS100001&periodCode=20233");
    }

    private <T> T client(Class<T> type) {
        return Feign.builder()
            .contract(new SpringMvcContract())
            .client((request, options) -> respond(request))
            .decoder((response, returnType) -> null)
            .target(type, TARGET);
    }

    private Response respond(Request request) {
        requestedUrls.add(request.url());
        return Response.builder()
            .status(200)
            .reason("OK")
            .request(request)
            .headers(Map.of())
            .body("{}", StandardCharsets.UTF_8)
            .build();
    }
}
