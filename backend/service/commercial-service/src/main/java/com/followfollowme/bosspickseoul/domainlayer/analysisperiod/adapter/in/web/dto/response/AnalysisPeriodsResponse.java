package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.response;

import com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.item.AnalysisDatasetPeriodItem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Builder;

@Builder
@Schema(description = "분석 기준 분기 카탈로그. 분석 API 에서 periodCode 를 생략하면 defaultPeriodCode 를 쓴다")
public record AnalysisPeriodsResponse(

    @Schema(description = "기본 분기. 원천이 끊기지 않은 데이터셋 모두에 적재된 분기 중 가장 최근 분기. 정할 수 없으면 null", example = "20261",
        nullable = true)
    String defaultPeriodCode,

    @Schema(description = "선택 가능한 분기 목록(최신순). 원천이 끊기지 않은 데이터셋 모두에 적재된 분기", example = "[\"20261\", \"20254\", \"20253\"]")
    List<String> availablePeriodCodes,

    @Schema(description = "선택 가능한 가장 오래된 분기. 목록이 비면 null", example = "20211", nullable = true)
    String firstPeriodCode,

    @Schema(description = "카탈로그를 계산한 공간 스냅샷 버전(배포 설정)", example = "legacy-20233")
    String spatialVersion,

    @Schema(description = "카탈로그를 계산한 시각. 인스턴스 메모리 캐시라 최대 몇 분 전 값일 수 있다", example = "2026-10-01T05:12:03+09:00")
    OffsetDateTime resolvedAt,

    @Schema(description = "데이터셋별 적재 분기 범위")
    List<AnalysisDatasetPeriodItem> datasets
) {

}
