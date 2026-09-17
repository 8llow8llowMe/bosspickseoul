package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 소비 지출 항목. 상권 원천과 행정동 원천의 <b>항목 구성이 다르므로</b> 두 구성의 합집합을 든다. (이슈 #415)
 *
 * <p>행정동 원천은 여가·문화를 {@link #LEISURE_CULTURE} 하나로 합쳐 주고, 상권에 없던 {@link #OTHER}·{@link #DINING}
 * 이 더 있다. 합산본을 둘로 반분하지 않는다 — 원천에 없는 수치를 만들어내는 것이고, 실측으로 확인한
 * 「총액 = 항목합」 정합(차이 0)도 깨진다.
 *
 * <p>화면 문구를 서버가 들고 있는 이유는 스코프마다 항목 수와 이름이 달라지기 때문이다. 프론트가 항목 키를
 * 하드코딩하면 스코프가 바뀔 때마다 화면이 깨진다. 응답은 항목 배열을 순서대로 내려보내고 화면은 그대로 그린다.
 */
@Getter
@RequiredArgsConstructor
public enum ExpenseCategoryType {
    GROCERY("식료품"),
    CLOTHING_FOOTWEAR("의류·신발"),
    MEDICAL("의료"),
    HOUSEHOLD("생활용품"),
    TRANSPORTATION("교통"),
    LEISURE("여가"),
    CULTURE("문화"),
    LEISURE_CULTURE("여가·문화"),
    EDUCATION("교육"),
    ENTERTAINMENT("유흥"),
    OTHER("기타"),
    DINING("음식");

    private final String label;
}
