package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.controller;

import com.followfollowme.nowdoboss.common.dto.Response;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AdministrationAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.CommercialComparisonAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.dto.response.DistrictAiReportResponse;
import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.nowdoboss.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ai-reports")
@Tag(name = "AI 리포트", description = "상권, 자치구, 행정동 분석 데이터를 AI 관점으로 요약하는 API를 제공합니다.")
public class AiReportWebController {

    private final AiReportWebUseCase aiReportWebUseCase;
    private final AiReportPresenter aiReportPresenter;

    @Operation(
        summary = "상권 AI 리포트 조회 (동기, deprecated)",
        description = "POST /commercials/{commercialCode} 비동기 엔드포인트로 이전 권장. 캐시 hit 면 즉시 반환, miss 면 LLM 호출이 동기 대기됩니다.",
        deprecated = true
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/commercials/{commercialCode}")
    public ResponseEntity<Response<CommercialAiReportResponse>> getCommercialReport(
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        CommercialAiReportResponse response = aiReportPresenter.toCommercialResponse(
            aiReportWebUseCase.getCommercialReport(commercialCode, serviceCode, periodCode)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "상권 AI 리포트 제출 (비동기)",
        description = "상권 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다."
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/commercials/{commercialCode}")
    public ResponseEntity<Response<AiReportSubmissionResponse>> submitCommercialReport(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "상권 코드", required = true, example = "3110008") @PathVariable String commercialCode,
        @Parameter(description = "서비스 코드", required = true, example = "CS100001") @RequestParam String serviceCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        AiReportSubmissionInfo info = aiReportWebUseCase.submitCommercialReport(
            principal.memberId(), commercialCode, serviceCode, periodCode
        );
        return toSubmissionResponse(info);
    }

    @Operation(
        summary = "AI 리포트 작업 상태 조회",
        description = "비동기 AI 리포트 작업의 진행 상태와 완료된 결과를 조회합니다. 본인이 제출한 작업만 조회할 수 있습니다."
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<Response<AiReportJobStatusResponse>> getJobStatus(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "작업 식별자", required = true) @PathVariable String jobId
    ) {
        AiReportJobStatusResponse response = aiReportPresenter.toJobStatusResponse(
            aiReportWebUseCase.getJobInfo(jobId, principal.memberId())
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "상권 비교 AI 인사이트 조회 (동기, deprecated)",
        description = "POST /commercials/comparisons 비동기 엔드포인트로 이전 권장.",
        deprecated = true
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/commercials/comparisons")
    public ResponseEntity<Response<CommercialComparisonAiReportResponse>> getCommercialComparisonReport(
        @ParameterObject
        @ModelAttribute CommercialComparisonAiQuery query
    ) {
        CommercialComparisonAiReportResponse response = aiReportPresenter.toCommercialComparisonResponse(
            aiReportWebUseCase.getCommercialComparisonReport(query)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "상권 비교 AI 리포트 제출 (비동기)",
        description = "두 상권의 비교 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다."
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/commercials/comparisons")
    public ResponseEntity<Response<AiReportSubmissionResponse>> submitCommercialComparisonReport(
        @AuthenticationPrincipal MemberLoginActive principal,
        @ParameterObject
        @ModelAttribute CommercialComparisonAiQuery query
    ) {
        AiReportSubmissionInfo info = aiReportWebUseCase.submitCommercialComparisonReport(principal.memberId(), query);
        return toSubmissionResponse(info);
    }

    @Operation(
        summary = "자치구 AI 리포트 조회 (동기, deprecated)",
        description = "POST /districts/{districtCode} 비동기 엔드포인트로 이전 권장.",
        deprecated = true
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/districts/{districtCode}")
    public ResponseEntity<Response<DistrictAiReportResponse>> getDistrictReport(
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        DistrictAiReportResponse response = aiReportPresenter.toDistrictResponse(
            aiReportWebUseCase.getDistrictReport(districtCode, periodCode)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "자치구 AI 리포트 제출 (비동기)",
        description = "자치구 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다."
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/districts/{districtCode}")
    public ResponseEntity<Response<AiReportSubmissionResponse>> submitDistrictReport(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "자치구 코드", required = true, example = "11680") @PathVariable String districtCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        AiReportSubmissionInfo info = aiReportWebUseCase.submitDistrictReport(principal.memberId(), districtCode, periodCode);
        return toSubmissionResponse(info);
    }

    @Operation(
        summary = "행정동 AI 리포트 조회 (동기, deprecated)",
        description = "POST /administrations/{administrationCode} 비동기 엔드포인트로 이전 권장.",
        deprecated = true
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/administrations/{administrationCode}")
    public ResponseEntity<Response<AdministrationAiReportResponse>> getAdministrationReport(
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        AdministrationAiReportResponse response = aiReportPresenter.toAdministrationResponse(
            aiReportWebUseCase.getAdministrationReport(administrationCode, periodCode)
        );
        return ResponseEntity.ok().body(Response.success(response));
    }

    @Operation(
        summary = "행정동 AI 리포트 제출 (비동기)",
        description = "행정동 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다."
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/administrations/{administrationCode}")
    public ResponseEntity<Response<AiReportSubmissionResponse>> submitAdministrationReport(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "행정동 코드", required = true, example = "11110515") @PathVariable String administrationCode,
        @Parameter(description = "기준 분기 코드", example = "20233") @RequestParam(defaultValue = "20233") String periodCode
    ) {
        AiReportSubmissionInfo info = aiReportWebUseCase.submitAdministrationReport(
            principal.memberId(), administrationCode, periodCode
        );
        return toSubmissionResponse(info);
    }

    private ResponseEntity<Response<AiReportSubmissionResponse>> toSubmissionResponse(AiReportSubmissionInfo info) {
        AiReportSubmissionResponse body = aiReportPresenter.toSubmissionResponse(info);
        HttpStatus status = info.submissionStatus() == AiReportSubmissionStatus.CACHED
            ? HttpStatus.OK
            : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(Response.success(body));
    }
}
