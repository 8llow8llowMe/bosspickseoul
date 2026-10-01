package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.in.web.dto.item;

import com.followfollowme.bosspickseoul.common.dto.metadata.CodeNameDescriptionMetadata;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "소득 지표의 출처 메타. 값이 없을 때도 어느 원천을 찾았고 왜 없는지 전하므로 항상 채워진다")
public record CommercialIncomeProvenanceItem(

    @Schema(
        description = "값을 가져온 영역 단위. code 는 DISTRICT_PROXY(자치구 대체) / UNAVAILABLE(제공 없음)",
        example = "{\"code\":\"DISTRICT_PROXY\",\"name\":\"자치구 대체\","
            + "\"description\":\"상권 단위 소득 원천이 없어 소속 자치구의 국민연금 지역가입자 신고 평균소득월액으로 대체한 참고값입니다.\"}")
    CodeNameDescriptionMetadata scope,

    @Schema(description = "값을 실제로 가져온 자치구 코드. scope.code 가 UNAVAILABLE 이면 null 이다", example = "11110", nullable = true)
    String scopeCode,

    @Schema(description = "값을 실제로 가져온 자치구 이름. scope.code 가 UNAVAILABLE 이면 null 이다", example = "종로구", nullable = true)
    String scopeName,

    @Schema(description = "원천 데이터셋 식별자", example = "data.go.kr:3046077")
    String sourceId,

    @Schema(description = "원천 데이터셋 이름", example = "국민연금공단 자격 시군구 신고 평균소득월액")
    String sourceLabel,

    @Schema(description = "원천 데이터셋 주소", example = "https://www.data.go.kr/data/3046077/fileData.do")
    String sourceUrl,

    @Schema(
        description = "값의 기준일(ISO 날짜). 원천이 연 1회(12월 기준) 스냅샷이라 요청 분기 말일 이하 가장 최근 기준일이다. "
            + "scope.code 가 UNAVAILABLE 이면 null 이다",
        example = "2024-12-31",
        nullable = true)
    String referenceDate,

    @Schema(
        description = "화면과 리포트가 그대로 쓰는 면책 문장. 대체(DISTRICT_PROXY)와 제공 없음(UNAVAILABLE) 모두 채워진다",
        example = "국민연금 지역가입자(사업장 가입자가 아닌 18~60세 국내 거주자)가 신고한 기준소득월액의 종로구 평균입니다(기준일 2024-12-31). "
            + "이 상권이나 주민 전체의 소득이 아니며, 같은 자치구 안의 상권은 모두 같은 값입니다.")
    String disclaimer
) {

}
