package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.common.dto.Response;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * 저장 전 중복 검사를 통과한 동시 요청이 유니크 제약에서 걸렸을 때,
 * 그대로 500 이 되지 않고 컨텍스트별로 의미 있는 409 가 되는지 검증한다.
 */
class CommercialUniqueViolationHandlerTest {

    private final CommercialExceptionHandler handler = new CommercialExceptionHandler();

    @Test
    @DisplayName("분석 보관함 유니크 위반은 ANALYSIS_BOOKMARK_002 409 가 된다")
    void analysisBookmarkViolation_returns409() {
        ResponseEntity<Response<Void>> response =
            handler.handleDataIntegrityViolation(violation("uk_analysis_bookmark_member_id_payload_hash"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().dataHeader().resultCode()).isEqualTo("ANALYSIS_BOOKMARK_002");
    }

    @Test
    @DisplayName("같은 payload 공유 링크 동시 생성은 SHARE_LINK_007 409 가 된다")
    void shareLinkPayloadViolation_returns409() {
        ResponseEntity<Response<Void>> response =
            handler.handleDataIntegrityViolation(violation("uk_share_link_payload_hash"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().dataHeader().resultCode()).isEqualTo("SHARE_LINK_007");
    }

    @Test
    @DisplayName("관련 없는 제약 위반은 중복으로 오인시키지 않고 그대로 전파한다")
    void unrelatedViolation_isRethrown() {
        DataIntegrityViolationException exception = violation("fk_share_link_member");

        assertThatThrownBy(() -> handler.handleDataIntegrityViolation(exception))
            .isSameAs(exception);
    }

    private static DataIntegrityViolationException violation(String constraintName) {
        return new DataIntegrityViolationException(
            "could not execute statement",
            new RuntimeException("Duplicate entry for key '" + constraintName + "'")
        );
    }
}
