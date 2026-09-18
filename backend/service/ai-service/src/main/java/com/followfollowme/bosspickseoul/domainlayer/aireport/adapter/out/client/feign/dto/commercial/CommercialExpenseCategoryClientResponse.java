package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 소비 항목 하나와 그 지출 금액의 wire 표현. peer 의 {@code CommercialExpenseCategoryItem} 과 같은 모양이다.
 *
 * <p>항목 구성이 스코프마다 다르므로(상권 9개 / 행정동 대체 10개) 고정 필드로 받지 않는다. 키를 여기서
 * 하드코딩하면 행정동 대체 스코프에만 있는 기타·음식이 조용히 사라진다. 라벨도 peer 가 내려보낸 것을
 * 그대로 쓴다 — 같은 값을 두 서비스가 각자 문구로 만들면 화면과 리포트가 갈린다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialExpenseCategoryClientResponse(
    String key,
    String label,
    long amount
) {

}
