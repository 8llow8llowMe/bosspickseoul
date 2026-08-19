package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "시뮬레이션 조건 항목 DTO")
public record SimulationConditionItem(

    @Schema(description = "프랜차이즈 창업 여부", example = "true")
    boolean franchisee,

    @Schema(description = "프랜차이즈 아이디 (비프랜차이즈면 null)", nullable = true)
    Long franchiseeId,

    @Schema(description = "브랜드 이름 (비프랜차이즈면 null)", nullable = true)
    String brandName,

    @Schema(description = "자치구 코드", example = "11740")
    String districtCode,

    @Schema(description = "자치구명", example = "강동구")
    String districtName,

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    String serviceCode,

    @Schema(description = "서비스 업종명", example = "한식음식점")
    String serviceName,

    @Schema(description = "매장 면적 (㎡)", example = "66")
    int storeSize,

    @Schema(description = "층 구분 메타데이터",
        example = "{\"code\":\"FIRST_FLOOR\",\"name\":\"1층\",\"description\":\"1층 매장 기준 임대료를 적용합니다.\"}")
    CodeNameDescriptionMetadata floorType,

    @Schema(description = "기준 분기 코드", example = "20233")
    String periodCode
) {

}
