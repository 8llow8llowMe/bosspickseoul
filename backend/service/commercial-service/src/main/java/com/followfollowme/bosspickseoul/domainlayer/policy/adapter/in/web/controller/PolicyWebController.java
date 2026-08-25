package com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.policy.adapter.in.web.dto.response.PolicyRecommendationResponse;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.exception.PolicyValidationMessage;
import com.followfollowme.bosspickseoul.domainlayer.policy.application.port.in.PolicyWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/policies")
@Tag(name = "지원 정책", description = "소상공인 지원 정책 추천 API를 제공합니다.")
public class PolicyWebController {

    private final PolicyWebUseCase policyWebUseCase;

    @Operation(
        summary = "지원 정책 추천 조회",
        description = "자치구와 업종 조건으로 신청 가능한 지원 정책을 추천합니다. "
            + "지역·업종은 범위 포함으로 매칭하므로, 자치구를 지정해도 지역 제한이 없는 전국 정책이 함께 나옵니다. "
            + "자치구 전용 정책이 앞에 오고 마감 임박순으로 정렬되며, 상시 모집은 뒤로 갑니다. "
            + "조건을 모두 생략하면 전체 정책을 같은 정렬로 조회합니다. 인증 없이 호출할 수 있습니다."
    )
    @GetMapping
    public ResponseEntity<Response<PolicyRecommendationResponse>> getPolicyRecommendations(
        @Parameter(description = "자치구 코드. 생략하면 지역 조건 없이 조회", example = "11680")
        @RequestParam(required = false) String districtCode,
        @Parameter(description = "업종 코드. 앞 3자리를 대분류로 사용한다", example = "CS100001")
        @RequestParam(required = false) String serviceCode,
        @Parameter(description = "조회 개수", example = "5")
        @RequestParam(defaultValue = "5")
        @Min(value = 1, message = PolicyValidationMessage.PAGE_SIZE_INVALID)
        @Max(value = 50, message = PolicyValidationMessage.PAGE_SIZE_INVALID) int size
    ) {
        PolicyRecommendationResponse response = policyWebUseCase.getRecommendations(districtCode, serviceCode, size);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
