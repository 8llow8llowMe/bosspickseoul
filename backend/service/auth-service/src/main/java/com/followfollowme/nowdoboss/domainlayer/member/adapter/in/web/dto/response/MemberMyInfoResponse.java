package com.followfollowme.nowdoboss.domainlayer.member.adapter.in.web.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "나의 회원 정보 조회 응답 DTO")
public record MemberMyInfoResponse(

    @Schema(description = "회원 아이디", example = "202507110001")
    String memberId,

    @Schema(description = "이메일 주소", example = "user@example.com")
    String email,

    @Schema(description = "회원 실명", example = "홍길동")
    String name,

    @Schema(description = "회원 닉네임", example = "길동짱")
    String nickname,

    @Schema(description = "프로필 이미지 URL", example = "https://cdn.tripmarble.com/profile.jpg")
    String profileImageUrl,

    @Schema(description = "회원 권한 코드", example = "USER")
    String roleCode,

    @Schema(description = "회원 권한 코드명", example = "일반 회원")
    String roleDescription
) {

}
