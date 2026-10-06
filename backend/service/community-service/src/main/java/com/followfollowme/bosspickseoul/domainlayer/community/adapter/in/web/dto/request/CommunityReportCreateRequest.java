package com.followfollowme.bosspickseoul.domainlayer.community.adapter.in.web.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.followfollowme.bosspickseoul.domainlayer.community.application.exception.CommunityValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportReasonCode;
import com.followfollowme.bosspickseoul.domainlayer.community.domain.enums.CommunityReportTargetKind;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 신고 등록 요청.
 *
 * <p>사유는 {@code reasonCode}(+ {@code detail})로 받는다(#473). {@code reason} 은 사유 코드 이전 클라이언트를 위한 호환 필드라
 * {@code reasonCode} 가 없을 때만 읽는다. 어느 쪽인지는 필드 하나로 정할 수 없어 아래 {@code @AssertTrue} 메서드가 요청 모양을 검사한다 —
 * 필드별 코드 대역(1xx)에 두려고 Processor 예외가 아니라 Bean Validation 으로 둔다. 오류 항목의 {@code field} 는 메서드 이름에서 나온
 * {@code reasonPresent}·{@code etcDetailPresent} 이므로 클라이언트는 {@code code} 로 분기한다.
 */
@Schema(description = "신고 등록 요청. 신규 클라이언트는 reasonCode(+ detail)를 보낸다")
public record CommunityReportCreateRequest(

    @Schema(description = "신고 대상 타입", example = "POST")
    @NotNull(message = CommunityValidationMessage.REPORT_TARGET_KIND_REQUIRED)
    CommunityReportTargetKind targetKind,

    @Schema(description = "신고 대상 ID", example = "1001")
    long targetId,

    @Schema(description = "신고 사유 코드. 신규 클라이언트는 필수로 보낸다(레거시 reason 호환 기간 동안만 선택). "
        + "SPAM 스팸·홍보 · ABUSE 욕설·비방 · PRIVACY 개인정보 노출 · FALSE_INFO 거짓 정보 · ETC 기타. 대소문자 무시, 잘못된 값은 COMMUNITY_018",
        example = "SPAM", nullable = true)
    String reasonCode,

    @Schema(description = "신고 상세 내용 (선택, 500자 이하 — COMMUNITY_124). reasonCode 가 ETC 면 필수(COMMUNITY_123)",
        example = "같은 홍보 글을 하루에 여러 번 올립니다.", nullable = true)
    @Size(max = 500, message = CommunityValidationMessage.REPORT_DETAIL_LENGTH_INVALID)
    String detail,

    @Schema(description = "신고 사유 (deprecated) — reasonCode 가 없을 때만 쓰는 호환 필드. reasonCode 가 있으면 무시한다. "
        + "「[스팸·홍보] 상세」처럼 사유 라벨 접두가 있으면 그 사유 코드로 저장한다. 500자 이하(COMMUNITY_111)",
        example = "[스팸·홍보] 광고성 게시글입니다.", nullable = true, deprecated = true)
    @Size(max = 500, message = CommunityValidationMessage.REPORT_REASON_LENGTH_INVALID)
    String reason
) {

    /** 사유 코드나 레거시 사유 중 하나는 있어야 한다 (COMMUNITY_110). */
    @JsonIgnore
    @Schema(hidden = true)
    @AssertTrue(message = CommunityValidationMessage.REPORT_REASON_REQUIRED)
    public boolean isReasonPresent() {
        return hasContent(reasonCode) || hasContent(reason);
    }

    /** 사유 코드가 ETC(대소문자 무시)면 상세가 있어야 한다 (COMMUNITY_123). 레거시 reason 경로에는 걸지 않는다. */
    @JsonIgnore
    @Schema(hidden = true)
    @AssertTrue(message = CommunityValidationMessage.REPORT_ETC_DETAIL_REQUIRED)
    public boolean isEtcDetailPresent() {
        return !CommunityReportReasonCode.ETC.name().equalsIgnoreCase(reasonCode) || hasContent(detail);
    }

    /**
     * 도메인 정규화({@code CommunityReportReason} — {@link String#trim()})와 같은 기준으로 내용이 있는지 본다.
     * {@code StringUtils.hasText} 는 제어문자만 있는 값을 내용으로 봐서, 여기를 통과한 ETC 상세가 도메인에서 null 이 되는 틈이 생긴다.
     */
    private static boolean hasContent(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
