package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportJobStatusResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.dto.response.AiReportSubmissionResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.presenter.AiReportPresenter;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.in.web.sse.AiReportJobSseStreamer;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.info.AiReportSubmissionInfo.AiReportSubmissionStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialComparisonAiQuery;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.in.AiReportWebUseCase;
import com.followfollowme.bosspickseoul.security.common.dto.MemberLoginActive;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ai-reports")
@Tag(name = "AI 리포트", description = "상권, 자치구, 행정동 분석 데이터를 AI 관점으로 요약하는 API를 제공합니다.")
public class AiReportWebController {

    private final AiReportWebUseCase aiReportWebUseCase;
    private final AiReportPresenter aiReportPresenter;
    private final AiReportJobSseStreamer aiReportJobSseStreamer;

    @Operation(
        summary = "상권 AI 리포트 제출 (비동기)",
        description = "상권 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다. "
            + "캐시 miss 인데 일별 사용량 상한을 넘겼으면 429 (AI_012) 로 거절됩니다."
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
        return toSubmissionResponseEntity(info);
    }

    @Operation(
        summary = "상권 비교 AI 인사이트 제출 (비동기)",
        description = "상권 비교 AI 인사이트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다. "
            + "캐시 miss 인데 일별 사용량 상한을 넘겼으면 429 (AI_012) 로 거절됩니다."
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @PostMapping("/commercials/comparisons")
    public ResponseEntity<Response<AiReportSubmissionResponse>> submitCommercialComparisonReport(
        @AuthenticationPrincipal MemberLoginActive principal,
        @ParameterObject
        @Valid @ModelAttribute CommercialComparisonAiQuery query
    ) {
        AiReportSubmissionInfo info = aiReportWebUseCase.submitCommercialComparisonReport(principal.memberId(), query);
        return toSubmissionResponseEntity(info);
    }

    @Operation(
        summary = "자치구 AI 리포트 제출 (비동기)",
        description = "자치구 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다. "
            + "캐시 miss 인데 일별 사용량 상한을 넘겼으면 429 (AI_012) 로 거절됩니다."
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
        return toSubmissionResponseEntity(info);
    }

    @Operation(
        summary = "행정동 AI 리포트 제출 (비동기)",
        description = "행정동 AI 리포트 작업을 제출합니다. 캐시 hit 면 200 + 결과, miss 면 202 + jobId 를 반환합니다. "
            + "캐시 miss 인데 일별 사용량 상한을 넘겼으면 429 (AI_012) 로 거절됩니다."
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
        return toSubmissionResponseEntity(info);
    }

    private ResponseEntity<Response<AiReportSubmissionResponse>> toSubmissionResponseEntity(AiReportSubmissionInfo info) {
        AiReportSubmissionResponse body = aiReportPresenter.toSubmissionResponse(info);
        HttpStatus status = info.submissionStatus() == AiReportSubmissionStatus.CACHED
            ? HttpStatus.OK
            : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(Response.success(body));
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
        summary = "AI 리포트 작업 상태 스트림 (SSE)",
        description = """
            비동기 AI 리포트 작업의 상태 변경을 Server-Sent Events 로 스트리밍합니다.
            이벤트 data 는 작업 상태 조회 응답의 dataBody 와 동일한 JSON 입니다. 본인이 제출한 작업만 구독할 수 있습니다.

            수신 주기: 이벤트는 주기적으로 오지 않고 **상태가 바뀔 때만** 전송됩니다.
            일반적으로 구독 즉시 현재 상태 스냅샷 1회 → RUNNING 전이 1회 → COMPLETED/FAILED 1회, 총 2~3회 수신 후
            서버가 연결을 종료합니다 (리포트 생성은 평균 수십 초 소요).
            25초 간격 하트비트는 SSE 코멘트 프레임이라 onmessage 로 수신되지 않으며 클라이언트 처리가 필요 없습니다.

            브라우저 기본 EventSource 는 Authorization 헤더를 지원하지 않으므로
            fetch 기반 SSE 클라이언트(예: @microsoft/fetch-event-source)를 사용하세요.
            연결이 끊기면 GET /jobs/{jobId} 폴링으로 폴백하면 됩니다. (상세: docs/ai-report-frontend-guide.md)"""
    )
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("isAuthenticated()")
    @GetMapping(value = "/jobs/{jobId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamJobStatus(
        @AuthenticationPrincipal MemberLoginActive principal,
        @Parameter(description = "작업 식별자", required = true) @PathVariable String jobId,
        HttpServletResponse response
    ) {
        // nginx 등 리버스 프록시가 이 응답을 버퍼링하지 않도록 응답 단위로 지시한다 (프록시 설정과 이중 방어).
        response.setHeader("X-Accel-Buffering", "no");
        return aiReportJobSseStreamer.stream(jobId, principal.memberId());
    }

}
