package com.followfollowme.nowdoboss.common.dto.metadata;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "코드명 메타데이터 DTO")
public record CodeNameDescriptionMetadata(

    @Schema(description = "내부 코드 값", example = "USER")
    String code,

    @Schema(description = "화면 표시 이름", example = "일반 회원")
    String name,

    @Schema(description = "코드 설명", example = "일반 회원 권한입니다.")
    String description
) {

    public static CodeNameDescriptionMetadata of(String code, String name, String description) {
        return CodeNameDescriptionMetadata.builder()
            .code(code)
            .name(name)
            .description(description)
            .build();
    }
}
