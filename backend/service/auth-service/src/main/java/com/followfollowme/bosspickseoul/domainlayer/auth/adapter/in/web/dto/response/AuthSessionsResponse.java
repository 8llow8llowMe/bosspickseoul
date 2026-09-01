package com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.auth.adapter.in.web.dto.item.AuthSessionItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "로그인 중인 기기 세션 목록 응답 DTO")
public record AuthSessionsResponse(

    @Schema(description = "기기 세션 목록 (마지막 사용 시각 내림차순)")
    List<AuthSessionItem> sessions
) {

}
