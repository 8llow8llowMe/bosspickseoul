package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

/**
 * 소비 항목 하나와 그 지출 금액.
 *
 * <p>항목 구성이 스코프마다 다르다(상권 네이티브 9개 / 행정동 대체 10개). 고정 필드 레코드로 받으면
 * 대체 스코프에만 있는 기타·음식이 통째로 사라지므로 배열 원소로 둔다. 라벨은 원천 서비스가 내려보낸 것을
 * 그대로 실어 나른다 — 같은 값의 문구를 두 서비스가 각자 만들면 화면과 리포트가 갈린다. (이슈 #415)
 */
@Builder
public record CommercialExpenseCategoryQueryResult(
    String key,
    String label,
    long amount
) {

}
