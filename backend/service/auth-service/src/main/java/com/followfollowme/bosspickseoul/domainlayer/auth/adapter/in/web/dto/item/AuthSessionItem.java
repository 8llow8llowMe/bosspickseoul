package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "로그인 중인 기기 세션 DTO")
public record AuthSessionItem(

    @Schema(description = "세션 아이디 (개별 해제 시 경로 변수로 사용)", example = "0f8fad5b-d9cb-469f-a165-70867728950e")
    String sessionId,

    @Schema(description = "기기 정보 (로그인 요청의 User-Agent 요약, 표시용)", example = "Mozilla/5.0 (iPhone; ...)")
    String deviceInfo,

    @Schema(description = "최초 로그인 시각", nullable = true)
    LocalDateTime createdAt,

    @Schema(description = "마지막 사용(토큰 발급/갱신) 시각", nullable = true)
    LocalDateTime lastUsedAt,

    @Schema(description = "현재 요청 기기의 세션 여부", example = "true")
    boolean current
) {

}
