package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 소비 지표를 실제로 담아 온 원천 데이터셋. 응답의 {@code sourceId}·{@code sourceLabel}·{@code sourceUrl} 이
 * 여기서 나온다. (이슈 #415)
 *
 * <p>출처 문구를 상수로 모아 두는 이유는 화면과 LLM 프롬프트가 같은 문장을 써야 하기 때문이다. 표기가 갈리면
 * 리포트와 화면이 서로 다른 출처를 말한다.
 */
@Getter
@RequiredArgsConstructor
public enum ExpenseSourceDataset {

    COMMERCIAL_CONSUMPTION(
        "VwsmTrdhlNcmCnsmpQq",
        "서울시 상권분석서비스(소득소비-상권배후지)",
        "https://data.seoul.go.kr/dataList/OA-21278/S/1/datasetView.do"),

    ADMINISTRATION_CONSUMPTION(
        "VwsmAdstrdNcmCnsmpW",
        "서울시 상권분석서비스(소득소비-행정동)",
        "https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do");

    private final String datasetId;
    private final String label;
    private final String url;
}
