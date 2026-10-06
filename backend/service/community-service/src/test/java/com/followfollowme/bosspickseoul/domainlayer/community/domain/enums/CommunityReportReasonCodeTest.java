package com.followfollowme.bosspickseoul.domainlayer.community.domain.enums;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * 신고 사유 코드(#473)의 파싱과 표시명을 검증한다. 신고 등록 본문과 모더레이션 목록 필터가 같은 {@code from} 을 쓴다.
 */
class CommunityReportReasonCodeTest {

    /** FE 라벨의 가운뎃점(U+00B7 MIDDLE DOT). 소스의 글자가 편집기·도구에서 비슷한 점으로 바뀌어도 잡히도록 코드 포인트로 적는다. */
    private static final char MIDDLE_DOT = (char) 0x00B7;
    /** 비슷하게 보이는 다른 점(U+30FB KATAKANA MIDDLE DOT). 표시명으로 인정하면 안 된다. */
    private static final char KATAKANA_MIDDLE_DOT = (char) 0x30FB;

    /**
     * FE {@code frontend/src/lib/community/report-reason.ts} 의 {@code COMMUNITY_REPORT_REASONS} 순서·글자 그대로.
     * 가운뎃점이 다른 점으로 바뀌면 레거시 {@code [라벨] 상세} 해석이 조용히 ETC 로 떨어진다.
     */
    private static final String[] FE_LABELS = {"스팸" + MIDDLE_DOT + "홍보", "욕설" + MIDDLE_DOT + "비방", "개인정보 노출", "거짓 정보", "기타"};

    @ParameterizedTest
    @CsvSource({
        "SPAM, SPAM",
        "spam, SPAM",
        "Abuse, ABUSE",
        "privacy, PRIVACY",
        "false_info, FALSE_INFO",
        "ETC, ETC"
    })
    @DisplayName("대소문자를 가리지 않고 상수명으로 파싱한다")
    void from_isCaseInsensitive(String value, CommunityReportReasonCode expected) {
        assertThat(CommunityReportReasonCode.from(value)).isEqualTo(expected);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"WRONG", "스팸" + MIDDLE_DOT + "홍보", "", "SPAM ", "FALSE-INFO"})
    @DisplayName("상수명이 아니면 COMMUNITY_018 로 거절한다 — 표시명도 코드가 아니다")
    void from_invalidValue_throwsInvalidReportReasonCode(String value) {
        assertThatThrownBy(() -> CommunityReportReasonCode.from(value))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_REPORT_REASON_CODE);
        assertThat(CommunityErrorCode.INVALID_REPORT_REASON_CODE.getCode()).isEqualTo("COMMUNITY_018");
    }

    @Test
    @DisplayName("표시명은 FE 신고 다이얼로그 라벨 5개와 순서·글자까지 같다")
    void displayNames_matchFrontendLabels() {
        assertThat(Arrays.stream(CommunityReportReasonCode.values()).map(CommunityReportReasonCode::getDisplayName))
            .containsExactly(FE_LABELS);
        assertThat(CommunityReportReasonCode.SPAM.toMetadata())
            .isEqualTo(CodeNameDescriptionMetadata.of("SPAM", FE_LABELS[0], FE_LABELS[0]));
    }

    @Test
    @DisplayName("표시명으로 코드를 찾는다 — 모르는 라벨이나 다른 가운뎃점은 empty")
    void fromDisplayName() {
        for (CommunityReportReasonCode code : CommunityReportReasonCode.values()) {
            assertThat(CommunityReportReasonCode.fromDisplayName(code.getDisplayName())).contains(code);
        }
        assertThat(CommunityReportReasonCode.fromDisplayName("스팸" + KATAKANA_MIDDLE_DOT + "홍보")).isEmpty();
        assertThat(CommunityReportReasonCode.fromDisplayName("SPAM")).isEmpty();
        assertThat(CommunityReportReasonCode.fromDisplayName("광고")).isEmpty();
        assertThat(CommunityReportReasonCode.fromDisplayName(null)).isEmpty();
    }
}
