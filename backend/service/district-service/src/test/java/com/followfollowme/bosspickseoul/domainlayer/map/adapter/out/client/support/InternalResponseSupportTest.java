package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.map.application.exception.MapException;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class InternalResponseSupportTest {

    private InternalResponseSupport support;

    @BeforeEach
    void setUp() {
        support = new InternalResponseSupport(CircuitBreakerRegistry.ofDefaults(), new ObjectMapper());
    }

    @Test
    void requestAndUnwrap_success_returnsDataBody() {
        String result = support.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE, () -> Response.success("payload"));

        assertThat(result).isEqualTo("payload");
    }

    @Test
    void requestAndUnwrap_notFound_translatesTo404WithUpstreamMessage() {
        // 이슈 #229: 하위 404(분기 데이터 없음)를 MAP_008 503 으로 보고하면 프론트가 재시도 루프를 돈다
        String body = "{\"dataHeader\":{\"success\":false,\"resultCode\":\"COMMERCIAL_007\","
            + "\"resultMessage\":\"해당 분기의 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.\"},\"dataBody\":null}";

        assertThatThrownBy(() -> support.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE, () -> {
                throw notFound(body);
            }))
            .isInstanceOf(MapException.class)
            .satisfies(exception -> {
                MapException mapException = (MapException) exception;
                assertThat(mapException.getErrorCode()).isEqualTo(MapErrorCode.UPSTREAM_DATA_NOT_FOUND);
                assertThat(mapException.getMessage())
                    .isEqualTo("해당 분기의 매출 데이터가 없습니다. 다른 분기를 선택해 주세요.");
            });
    }

    @Test
    void requestAndUnwrap_notFoundWithoutContractBody_fallsBackToDefaultMessage() {
        assertThatThrownBy(() -> support.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE, () -> {
                throw notFound("not-json");
            }))
            .isInstanceOf(MapException.class)
            .satisfies(exception -> {
                MapException mapException = (MapException) exception;
                assertThat(mapException.getErrorCode()).isEqualTo(MapErrorCode.UPSTREAM_DATA_NOT_FOUND);
                assertThat(mapException.getMessage()).isEqualTo(MapErrorCode.UPSTREAM_DATA_NOT_FOUND.getMessage());
            });
    }

    @Test
    void requestAndUnwrap_serverError_translatesToServiceUnavailable() {
        assertThatThrownBy(() -> support.requestAndUnwrap(
            InternalResponseSupport.COMMERCIAL_SERVICE, () -> {
                throw new FeignException.InternalServerError("boom", request(), null, Map.of());
            }))
            .isInstanceOf(MapException.class)
            .extracting(exception -> ((MapException) exception).getErrorCode())
            .isEqualTo(MapErrorCode.INTERNAL_SERVICE_UNAVAILABLE);
    }

    private FeignException.NotFound notFound(String body) {
        return new FeignException.NotFound(
            "not found", request(), body.getBytes(StandardCharsets.UTF_8), Map.of());
    }

    private Request request() {
        return Request.create(Request.HttpMethod.GET, "/", Map.of(), null, StandardCharsets.UTF_8, new RequestTemplate());
    }
}
