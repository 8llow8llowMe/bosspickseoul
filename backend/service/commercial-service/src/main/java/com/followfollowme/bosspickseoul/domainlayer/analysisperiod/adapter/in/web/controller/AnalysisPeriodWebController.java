package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.response.AnalysisPeriodsResponse;
import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.application.port.in.AnalysisPeriodWebUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/commercials")
@Tag(name = "분석 기준 분기", description = "적재된 데이터 기준 분석 분기 카탈로그 API")
public class AnalysisPeriodWebController {

    private final AnalysisPeriodWebUseCase analysisPeriodWebUseCase;

    @Operation(summary = "분석 기준 분기 카탈로그 조회",
        description = "적재된 팩트 데이터 기준 기본 분기와 선택 가능한 분기 목록, 데이터셋별 적재 범위를 조회합니다. "
            + "분석 API 에서 periodCode 를 생략하면 defaultPeriodCode 를 씁니다. 원천이 끊긴 데이터셋(coreForDefault=false)은 기본 분기 계산에서 빠집니다. "
            + "인스턴스 메모리 캐시라 resolvedAt 이 최대 몇 분 전일 수 있고, DB 장애 중에는 마지막으로 계산한 값을 그대로 내려줍니다.")
    @GetMapping("/periods")
    public ResponseEntity<Response<AnalysisPeriodsResponse>> getAnalysisPeriods() {
        AnalysisPeriodsResponse response = analysisPeriodWebUseCase.getAnalysisPeriods();
        return ResponseEntity.ok().body(Response.success(response));
    }
}
