package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.in.web.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import lombok.Builder;

@Builder
@Schema(description = "데이터셋 하나의 적재 분기 범위")
public record AnalysisDatasetPeriodItem(

    @Schema(description = "데이터셋 식별 코드(화면 표시용 아님). 분기 적재 배치의 데이터셋 이름과 같다", example = "SALES_COMMERCIAL")
    String dataset,

    @Schema(description = "원천 데이터셋 식별자(서울 열린데이터광장 Open API 서비스명). 소비 응답 provenance 의 sourceId 와 같은 값", example = "VwsmTrdarSelngQq")
    String sourceId,

    @Schema(description = "가장 최근 적재 분기. 적재된 행이 없으면 null", example = "20262", nullable = true)
    String latestPeriodCode,

    @Schema(description = "가장 오래된 적재 분기. 적재된 행이 없으면 null", example = "20211", nullable = true)
    String firstPeriodCode,

    @Schema(description = "적재된 분기 수", example = "22")
    int periodCount,

    @Schema(description = "기본 분기 교집합에 들어가는지. 원천 중단 상한이 있는 데이터셋은 false", example = "true")
    boolean coreForDefault,

    @Schema(description = "원천 중단으로 더 게시할 수 없는 마지막 분기. 상한이 없으면 null", example = "20234", nullable = true)
    String lastPublishablePeriodCode,

    @Schema(description = "최신 분기 게시 시각. 아직 제공하지 않아 항상 null (후속 이슈)", nullable = true)
    OffsetDateTime publishedAt,

    @Schema(description = "원천 스키마 버전. 아직 제공하지 않아 항상 null (후속 이슈)", nullable = true)
    String schemaVersion
) {

}
