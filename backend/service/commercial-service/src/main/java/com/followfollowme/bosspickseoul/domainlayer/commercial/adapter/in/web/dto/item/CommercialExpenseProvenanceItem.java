package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "소비 지표의 출처 메타. 값이 없을 때도 어느 원천이 왜 끊겼는지 전하므로 항상 채워진다")
public record CommercialExpenseProvenanceItem(

    @Schema(
        description = "값을 가져온 영역 단위. code 는 COMMERCIAL(상권 네이티브) / ADMINISTRATION_PROXY(행정동 대체) / UNAVAILABLE(제공 없음)",
        example = "{\"code\":\"ADMINISTRATION_PROXY\",\"name\":\"행정동 대체\",\"description\":\"상권 단위 원천이 중단돼 소속 행정동 값으로 대체한 추정치입니다.\"}")
    CodeNameDescriptionMetadata scope,

    @Schema(description = "값을 실제로 가져온 영역의 코드. scope.code 가 UNAVAILABLE 이면 null 이다", example = "11110515", nullable = true)
    String scopeCode,

    @Schema(description = "값을 실제로 가져온 영역의 이름. scope.code 가 UNAVAILABLE 이면 null 이다", example = "청운효자동", nullable = true)
    String scopeName,

    @Schema(description = "원천 데이터셋 식별자", example = "VwsmAdstrdNcmCnsmpW")
    String sourceId,

    @Schema(description = "원천 데이터셋 이름", example = "서울시 상권분석서비스(소득소비-행정동)")
    String sourceLabel,

    @Schema(description = "원천 데이터셋 주소", example = "https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do")
    String sourceUrl,

    @Schema(description = "값의 기준 분기. scope.code 가 UNAVAILABLE 이면 null 이다", example = "20261", nullable = true)
    String effectivePeriodCode,

    @Schema(
        description = "화면과 리포트가 그대로 쓰는 면책 문장. 대체(ADMINISTRATION_PROXY)와 제공 없음(UNAVAILABLE)일 때만 채워지고 "
            + "상권 네이티브(COMMERCIAL)에서는 null 이다",
        example = "2024년 1분기부터 서울 열린데이터광장이 상권 단위 소비 제공을 중단해, 소속 행정동(청운효자동)의 추정 소비로 대체 표시합니다. 같은 행정동 안의 상권은 같은 값입니다.",
        nullable = true)
    String disclaimer
) {

}
