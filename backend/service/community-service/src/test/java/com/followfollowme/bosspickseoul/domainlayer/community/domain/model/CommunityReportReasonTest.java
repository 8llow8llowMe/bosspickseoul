package com.followfollowme.bosspickseoul.domainlayer.community.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityException;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * 신고 요청을 저장할 사유(코드·상세·레거시 원문)로 해석하는 규칙(#473)을 검증한다.
 */
class CommunityReportReasonTest {

    /** FE 라벨의 가운뎃점(U+00B7). 소스 글자가 편집기·도구에서 비슷한 점으로 바뀌어도 잡히도록 코드 포인트로 적는다. */
    private static final char MIDDLE_DOT = (char) 0x00B7;
    /** 비슷하게 보이는 다른 점(U+30FB KATAKANA MIDDLE DOT). 표시명으로 인정하면 안 된다. */
    private static final char KATAKANA_MIDDLE_DOT = (char) 0x30FB;

    @Test
    @DisplayName("사유 코드가 있으면 그 코드와 trim 한 상세를 쓰고 reason 은 무시한다")
    void resolve_withReasonCode_usesCodeAndDetail() {
        CommunityReportReason resolved = CommunityReportReason.resolve(
            "spam",
            "  같은 홍보 글  ",
            "[욕설" + MIDDLE_DOT + "비방] 무시되는 레거시"
        );

        assertThat(resolved.code()).isEqualTo(CommunityReportReasonCode.SPAM);
        assertThat(resolved.detail()).isEqualTo("같은 홍보 글");
        assertThat(resolved.legacyReason()).isEqualTo("같은 홍보 글");
    }

    @Test
    @DisplayName("신규 요청의 상세가 공백이면 null 이고, 레거시 원문은 코드 표시명이다")
    void resolve_withReasonCode_blankDetail_isNull() {
        CommunityReportReason resolved = CommunityReportReason.resolve("ABUSE", " \n\t ", "무시");

        assertThat(resolved.code()).isEqualTo(CommunityReportReasonCode.ABUSE);
        assertThat(resolved.detail()).isNull();
        assertThat(resolved.legacyReason()).isEqualTo(CommunityReportReasonCode.ABUSE.getDisplayName());
    }

    @Test
    @DisplayName("ETC 신규 요청은 상세를 그대로 상세와 레거시 원문으로 둔다")
    void resolve_etc_keepsDetail() {
        CommunityReportReason resolved = CommunityReportReason.resolve("etc", "  기타 내용  ", null);

        assertThat(resolved.code()).isEqualTo(CommunityReportReasonCode.ETC);
        assertThat(resolved.detail()).isEqualTo("기타 내용");
        assertThat(resolved.legacyReason()).isEqualTo("기타 내용");
    }

    @ParameterizedTest(name = "{0} → {1}, detail={2}")
    @MethodSource("legacyLabels")
    @DisplayName("레거시 [라벨] 접두를 표시명과 맞는 코드로 읽고, 상세가 없으면 null 이다")
    void resolve_legacyLabel(String reason, CommunityReportReasonCode code, String detail) {
        CommunityReportReason resolved = CommunityReportReason.resolve(null, null, "  " + reason + "  ");

        assertThat(resolved.code()).isEqualTo(code);
        assertThat(resolved.detail()).isEqualTo(detail);
        assertThat(resolved.legacyReason()).isEqualTo(reason);
    }

    @Test
    @DisplayName("모르는 라벨 접두와 접두 없는 문자열은 ETC 이고 원문 전체가 상세다")
    void resolve_unknownOrBareReason_isEtcWithFullText() {
        CommunityReportReason unknown = CommunityReportReason.resolve("   ", null, "  [광고] 내용  ");
        assertThat(unknown.code()).isEqualTo(CommunityReportReasonCode.ETC);
        assertThat(unknown.detail()).isEqualTo("[광고] 내용");
        assertThat(unknown.legacyReason()).isEqualTo("[광고] 내용");

        CommunityReportReason bare = CommunityReportReason.resolve(null, "무시되는 상세", "  그냥 사유  ");
        assertThat(bare.code()).isEqualTo(CommunityReportReasonCode.ETC);
        assertThat(bare.detail()).isEqualTo("그냥 사유");
        assertThat(bare.legacyReason()).isEqualTo("그냥 사유");
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "[스팸" + KATAKANA_MIDDLE_DOT + "홍보] 다른 가운뎃점",
        "[SPAM] 코드는 라벨이 아니다",
        "[] 빈 라벨",
        "광고성 글입니다. [스팸" + MIDDLE_DOT + "홍보]"
    })
    @DisplayName("표시명과 글자가 다른 라벨·코드 라벨·빈 라벨·중간의 접두는 ETC 이고 원문 전체가 상세다")
    void resolve_lookalikeOrMisplacedLabel_isEtcWithFullText(String reason) {
        CommunityReportReason resolved = CommunityReportReason.resolve(null, null, reason);

        assertThat(resolved.code()).isEqualTo(CommunityReportReasonCode.ETC);
        assertThat(resolved.detail()).isEqualTo(reason);
        assertThat(resolved.legacyReason()).isEqualTo(reason);
    }

    @Test
    @DisplayName("라벨 뒤 공백이 없거나 여러 개여도 접두를 읽는다")
    void resolve_legacyLabel_withoutOrManySpaces() {
        CommunityReportReason noSpace = CommunityReportReason.resolve(null, null, "[거짓 정보]사실이 아닙니다");
        assertThat(noSpace.code()).isEqualTo(CommunityReportReasonCode.FALSE_INFO);
        assertThat(noSpace.detail()).isEqualTo("사실이 아닙니다");

        CommunityReportReason manySpaces = CommunityReportReason.resolve(null, null, "[개인정보 노출]    전화번호");
        assertThat(manySpaces.code()).isEqualTo(CommunityReportReasonCode.PRIVACY);
        assertThat(manySpaces.detail()).isEqualTo("전화번호");
        assertThat(manySpaces.legacyReason()).isEqualTo("[개인정보 노출]    전화번호");
    }

    @Test
    @DisplayName("레거시 상세의 줄바꿈은 유지한다")
    void resolve_legacyDetail_keepsNewline() {
        String reason = "[스팸" + MIDDLE_DOT + "홍보] 첫 줄\n둘째 줄";

        CommunityReportReason resolved = CommunityReportReason.resolve(null, null, reason);

        assertThat(resolved.code()).isEqualTo(CommunityReportReasonCode.SPAM);
        assertThat(resolved.detail()).isEqualTo("첫 줄\n둘째 줄");
        assertThat(resolved.legacyReason()).isEqualTo(reason);
    }

    @Test
    @DisplayName("잘못된 사유 코드는 COMMUNITY_018 이다")
    void resolve_invalidReasonCode_throws() {
        assertThatThrownBy(() -> CommunityReportReason.resolve("NOPE", "상세", "[기타] 레거시"))
            .isInstanceOf(CommunityException.class)
            .extracting(exception -> ((CommunityException) exception).getErrorCode())
            .isEqualTo(CommunityErrorCode.INVALID_REPORT_REASON_CODE);
    }

    @Test
    @DisplayName("사유 코드와 레거시 사유가 둘 다 없으면 해석할 수 없다")
    void resolve_withoutEither_throws() {
        assertThatThrownBy(() -> CommunityReportReason.resolve(null, null, "  "))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CommunityReportReason.resolve("", "상세만", null))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("제어문자만 있는 값은 요청 DTO 검증과 같이 「없음」이다 — 사유 코드는 레거시로, 레거시 사유는 해석 불가로")
    void resolve_controlCharOnly_isAbsent() {
        String controlCharOnly = String.valueOf((char) 0x0001);

        CommunityReportReason resolved = CommunityReportReason.resolve(
            controlCharOnly, null, "[스팸" + MIDDLE_DOT + "홍보] 광고성 글");

        assertThat(resolved.code()).isEqualTo(CommunityReportReasonCode.SPAM);
        assertThat(resolved.detail()).isEqualTo("광고성 글");
        assertThatThrownBy(() -> CommunityReportReason.resolve(null, null, controlCharOnly))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static Stream<Arguments> legacyLabels() {
        return Stream.of(
            legacy("스팸" + MIDDLE_DOT + "홍보", "광고성 글", CommunityReportReasonCode.SPAM, "광고성 글"),
            legacy("스팸" + MIDDLE_DOT + "홍보", "", CommunityReportReasonCode.SPAM, null),
            legacy("욕설" + MIDDLE_DOT + "비방", "모욕", CommunityReportReasonCode.ABUSE, "모욕"),
            legacy("욕설" + MIDDLE_DOT + "비방", "", CommunityReportReasonCode.ABUSE, null),
            legacy("개인정보 노출", "전화번호", CommunityReportReasonCode.PRIVACY, "전화번호"),
            legacy("개인정보 노출", "", CommunityReportReasonCode.PRIVACY, null),
            legacy("거짓 정보", "사실과 다름", CommunityReportReasonCode.FALSE_INFO, "사실과 다름"),
            legacy("거짓 정보", "", CommunityReportReasonCode.FALSE_INFO, null),
            legacy("기타", "추가 설명", CommunityReportReasonCode.ETC, "추가 설명"),
            legacy("기타", "", CommunityReportReasonCode.ETC, null)
        );
    }

    private static Arguments legacy(String label, String detail, CommunityReportReasonCode code, String expectedDetail) {
        String reason = detail.isEmpty() ? "[" + label + "]" : "[" + label + "] " + detail;
        return Arguments.of(reason, code, expectedDetail);
    }
}
