package com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.request.SimulationHistorySaveRequest;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.request.SimulationReportRequest;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationFranchiseesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistoriesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationHistorySaveResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationReportResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.adapter.in.web.dto.response.SimulationStoreSizesResponse;
import com.followfollowme.bosspickseoul.domainlayer.simulation.application.port.in.SimulationWebUseCase;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/simulations")
@Tag(name = "창업 시뮬레이션", description = "자치구·업종·매장 조건 기반 창업 비용 시뮬레이션 API를 제공합니다.")
public class SimulationWebController {

    private final SimulationWebUseCase simulationWebUseCase;

    @Operation(summary = "업종별 매장 크기 기준 조회", description = "업종별 소/중/대 매장 크기(㎡·평)를 조회합니다. 인증 없이 호출할 수 있습니다.")
    @GetMapping("/store-sizes")
    public ResponseEntity<Response<SimulationStoreSizesResponse>> getStoreSizes(
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode
    ) {
        return ResponseEntity.ok().body(Response.success(simulationWebUseCase.getStoreSizes(serviceCode)));
    }

    @Operation(
        summary = "프랜차이즈 검색",
        description = "업종 내 프랜차이즈를 브랜드명 키워드로 검색합니다. 커서(lastId) 기반으로 최대 10건씩 반환하며, "
            + "응답의 lastId 를 다음 요청에 넘기면 이어서 조회됩니다. 인증 없이 호출할 수 있습니다."
    )
    @GetMapping("/franchisees")
    public ResponseEntity<Response<SimulationFranchiseesResponse>> searchFranchisees(
        @Parameter(description = "서비스 업종 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "브랜드명 키워드 (부분 일치, 생략 시 전체)") @RequestParam(required = false) String keyword,
        @Parameter(description = "커서 — 직전 응답의 lastId (첫 조회면 생략)") @RequestParam(required = false) Long lastId
    ) {
        return ResponseEntity.ok().body(Response.success(
            simulationWebUseCase.searchFranchisees(serviceCode, keyword, lastId)));
    }

    @Operation(
        summary = "창업 시뮬레이션 계산",
        description = """
            자치구·업종·매장 면적·층·프랜차이즈 여부로 예상 창업 비용을 계산합니다.
            총비용 = 월 임대료(면적×자치구 3.3㎡당 임대료) + 보증금(월 임대료 10개월분) + 인테리어 + 가맹 부담금(프랜차이즈만).
            함께 권리금 수준, 유사 예산 프랜차이즈 Top 5, 성별·연령 매출 분석, 성수기/비성수기를 제공합니다.
            인증 없이 호출할 수 있습니다."""
    )
    @PostMapping("/reports")
    public ResponseEntity<Response<SimulationReportResponse>> simulate(
        @Valid @RequestBody SimulationReportRequest request
    ) {
        return ResponseEntity.ok().body(Response.success(simulationWebUseCase.simulate(request)));
    }

    @Operation(summary = "시뮬레이션 결과 저장", description = "시뮬레이션 조건과 총비용을 회원 보관함에 저장합니다.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/histories")
    public ResponseEntity<Response<SimulationHistorySaveResponse>> saveHistory(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Valid @RequestBody SimulationHistorySaveRequest request
    ) {
        return ResponseEntity.ok().body(Response.success(
            simulationWebUseCase.saveHistory(principal.memberId(), request)));
    }

    @Operation(summary = "저장된 시뮬레이션 목록 조회", description = "본인이 저장한 시뮬레이션 이력을 최신순으로 조회합니다.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/histories")
    public ResponseEntity<Response<SimulationHistoriesResponse>> getHistories(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "페이지 (0부터)") @RequestParam(defaultValue = "0") @Min(0) int page,
        @Parameter(description = "페이지 크기 (1~50)") @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size
    ) {
        return ResponseEntity.ok().body(Response.success(
            simulationWebUseCase.getHistories(principal.memberId(), page, size)));
    }
}
