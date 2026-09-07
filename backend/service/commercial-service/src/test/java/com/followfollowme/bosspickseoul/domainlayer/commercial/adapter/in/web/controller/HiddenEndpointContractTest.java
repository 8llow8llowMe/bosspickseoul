package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.controller;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.annotations.Hidden;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * `@Hidden` 엔드포인트 목록을 못 박는다.
 *
 * <p>`@Hidden` 은 `/v3/api-docs` 에서 빠지고, 그러면 프론트가 계약 정본으로 쓰는 OpenAPI 스냅샷에도
 * 안 들어온다. 프론트가 그 엔드포인트를 쓰기 시작해도 응답과 타입이 어긋난 걸 아무도 못 잡는다.
 * 실제로 `/{commercialCode}/profile` 이 숨겨져 있는 동안 `policyRecommendations` 가 통째로
 * 누락됐고 좌표 필드가 있다고 잘못 선언돼 있었다.
 *
 * <p>그래서 숨김은 "지도(district-service)가 감싸서 공개하는 내부 전용" 4건으로만 한정하고,
 * 목록이 바뀌면 이 테스트가 깨지게 한다. 새로 숨기려면 공개 대체 경로가 있는지 확인하고
 * 여기와 `docs/services/commercial-service.md` 를 함께 고쳐야 한다.
 */
class HiddenEndpointContractTest {

    /** district-service `/api/v1/map/**` 이 감싸 공개하므로 문서에서 숨기는 내부 전용 경로. */
    private static final Set<String> ALLOWED_HIDDEN_PATHS = Set.of(
        "/heatmap",
        "/candidates",
        "/heatmap-composite",
        "/compare-preview"
    );

    @Test
    @DisplayName("문서에서 숨긴 엔드포인트는 허용 목록과 정확히 일치한다")
    void hiddenEndpointsMatchAllowList() {
        assertThat(hiddenGetPaths()).isEqualTo(new TreeSet<>(ALLOWED_HIDDEN_PATHS));
    }

    @Test
    @DisplayName("상권 프로필은 공개 계약이라 숨기지 않는다")
    void commercialProfileIsNotHidden() {
        assertThat(hiddenGetPaths()).doesNotContain("/{commercialCode}/profile");
    }

    private static Set<String> hiddenGetPaths() {
        return Arrays.stream(CommercialWebController.class.getDeclaredMethods())
            .filter(method -> method.isAnnotationPresent(Hidden.class))
            .map(HiddenEndpointContractTest::pathOf)
            .collect(Collectors.toCollection(TreeSet::new));
    }

    private static String pathOf(Method method) {
        GetMapping mapping = method.getAnnotation(GetMapping.class);
        if (mapping == null || mapping.value().length == 0) {
            return method.getName();
        }
        return mapping.value()[0];
    }
}
