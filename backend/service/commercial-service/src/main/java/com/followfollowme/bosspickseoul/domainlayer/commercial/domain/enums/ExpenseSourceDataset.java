package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import lombok.RequiredArgsConstructor;

/**
 * 소비 지표를 실제로 담아 온 원천 데이터셋. 응답의 {@code sourceId}·{@code sourceLabel}·{@code sourceUrl} 이
 * 여기서 나온다. (이슈 #415)
 *
 * <p>출처 문구를 상수로 모아 두는 이유는 화면과 LLM 프롬프트가 같은 문장을 써야 하기 때문이다. 표기가 갈리면
 * 리포트와 화면이 서로 다른 출처를 말한다.
 *
 * <p><b>식별자({@code sourceId})는 여기서 정의하지 않는다.</b> 같은 문자열을 batch-service 의 {@code Dataset} 과
 * 여기 양쪽에 박아 두면, 포털이 데이터셋을 재게시했을 때 배치만 고쳐도 배치는 돌아가고 이 서비스는 죽은
 * 데이터셋 ID 와 주소를 출처로 계속 인용한다. 정본은 공유 모듈의 {@link DatasetKey#openApiService()} 하나다.
 * 스코프 -> 원천 매핑({@link ExpenseScopeType#source()})만 이 서비스가 들고 있다.
 */
@RequiredArgsConstructor
public enum ExpenseSourceDataset {

    COMMERCIAL_CONSUMPTION(
        DatasetKey.CONSUMPTION_COMMERCIAL,
        "서울시 상권분석서비스(소득소비-상권배후지)",
        "https://data.seoul.go.kr/dataList/OA-21278/S/1/datasetView.do"),

    ADMINISTRATION_CONSUMPTION(
        DatasetKey.CONSUMPTION_ADMINISTRATION,
        "서울시 상권분석서비스(소득소비-행정동)",
        "https://data.seoul.go.kr/dataList/OA-22166/S/1/datasetView.do");

    private final DatasetKey datasetKey;
    private final String label;
    private final String url;

    /** 데이터셋 식별자. 배치가 Open API 를 호출할 때 쓰는 서비스명과 같은 값이다. */
    public String getDatasetId() {
        return datasetKey.openApiService();
    }

    /** 이 원천이 대응하는 공유 데이터셋 계약. 배치 게시 축과 조회 축이 같은 상수를 보는지 테스트가 고정한다. */
    public DatasetKey getDatasetKey() {
        return datasetKey;
    }

    public String getLabel() {
        return label;
    }

    public String getUrl() {
        return url;
    }
}
