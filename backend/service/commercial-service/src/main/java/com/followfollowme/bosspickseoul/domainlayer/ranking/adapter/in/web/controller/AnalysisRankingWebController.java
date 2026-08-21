package com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.in.web.controller;

import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.ranking.adapter.in.web.dto.response.AnalysisRankingResponse;
import com.followfollowme.bosspickseoul.domainlayer.ranking.application.port.in.RankingWebUseCase;
import com.followfollowme.bosspickseoul.domainlayer.ranking.domain.enums.AnalysisAreaType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/analysis-rankings")
@Tag(name = "분석 인기 순위", description = "사용자가 많이 조회한 상권/자치구/행정동 실시간 인기 순위 API를 제공합니다.")
public class AnalysisRankingWebController {

    private final RankingWebUseCase rankingWebUseCase;

    @Operation(
        summary = "분석 인기 순위 조회",
        description = "최근 시간 윈도우 내 조회 수 기준 인기 순위를 반환합니다. "
            + "집계 파이프라인(Kafka/Redis) 장애 시에도 다른 분석 API에는 영향이 없으며, 이 API만 RANKING_001(503)로 응답합니다."
    )
    @GetMapping
    public ResponseEntity<Response<AnalysisRankingResponse>> getAnalysisRankings(
        @Parameter(description = "분석 영역 타입") @RequestParam AnalysisAreaType areaType,
        @Parameter(description = "조회 개수 (1~50)", example = "10") @RequestParam(defaultValue = "10") int size
    ) {
        AnalysisRankingResponse response = rankingWebUseCase.getAnalysisRankings(areaType, size);
        return ResponseEntity.ok().body(Response.success(response));
    }
}
