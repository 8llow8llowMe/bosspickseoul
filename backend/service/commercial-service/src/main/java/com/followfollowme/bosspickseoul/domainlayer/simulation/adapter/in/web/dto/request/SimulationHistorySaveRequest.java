package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.request;

import com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception.SimulationValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.simulation.domain.enums.SimulationFloorType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Builder;

@Builder
@Schema(description = "창업 시뮬레이션 결과 저장 요청 DTO")
public record SimulationHistorySaveRequest(

    @Schema(description = "프랜차이즈 창업 여부", example = "true")
    @NotNull(message = SimulationValidationMessage.FRANCHISEE_REQUIRED)
    Boolean franchisee,

    @Schema(description = "프랜차이즈 아이디 (franchisee=true 일 때 필수)", nullable = true)
    Long franchiseeId,

    @Schema(description = "자치구 코드", example = "11740")
    @NotBlank(message = SimulationValidationMessage.DISTRICT_CODE_REQUIRED)
    String districtCode,

    @Schema(description = "서비스 업종 코드", example = "CS100001")
    @NotBlank(message = SimulationValidationMessage.SERVICE_CODE_REQUIRED)
    String serviceCode,

    @Schema(description = "매장 면적 (㎡)", example = "66")
    @NotNull(message = SimulationValidationMessage.STORE_SIZE_POSITIVE)
    @Positive(message = SimulationValidationMessage.STORE_SIZE_POSITIVE)
    Integer storeSize,

    @Schema(description = "층 구분", example = "FIRST_FLOOR")
    @NotNull(message = SimulationValidationMessage.FLOOR_TYPE_REQUIRED)
    SimulationFloorType floorType,

    @Schema(description = "총 창업 비용 (만원)", example = "12345")
    @NotNull(message = SimulationValidationMessage.TOTAL_PRICE_POSITIVE)
    @PositiveOrZero(message = SimulationValidationMessage.TOTAL_PRICE_POSITIVE)
    Long totalPrice
) {

}
