package com.followfollowme.nowdoboss.domainlayer.simulation.adapter.in.web.dto.item;

import com.followfollowme.nowdoboss.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;

@Builder
@Schema(description = "저장된 시뮬레이션 이력 항목 DTO")
public record SimulationHistoryItem(

    @Schema(description = "이력 아이디", example = "1")
    long historyId,

    @Schema(description = "프랜차이즈 창업 여부", example = "true")
    boolean franchisee,

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

    @Schema(description = "층 구분 메타데이터")
    CodeNameDescriptionMetadata floorType,

    @Schema(description = "총 창업 비용 (만원)", example = "12345")
    long totalPrice,

    @Schema(description = "저장 시각")
    LocalDateTime createdAt
) {

}
