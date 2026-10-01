package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.enums;

import com.followfollowme.bosspickseoul.shared.enums.FileDatasetKey;
import lombok.RequiredArgsConstructor;

/**
 * 소득 지표를 실제로 담아 온 원천 데이터셋. 응답의 {@code sourceId}·{@code sourceLabel}·{@code sourceUrl} 이 여기서 나온다.
 * (이슈 #415)
 *
 * <p>{@link ExpenseSourceDataset} 과 나눈 이유는 원천의 성격이 달라서다. 소비 원천은 서울 열린데이터광장 분기 Open API 이고
 * 계약이 {@code DatasetKey} 이지만, 이 원천은 공공데이터포털에서 사람이 내려받는 연 1회 파일이라 계약이
 * {@link FileDatasetKey} 다.
 *
 * <p><b>식별자({@code sourceId})는 여기서 정의하지 않는다.</b> 같은 문자열을 batch-service 와 여기 양쪽에 박아 두면 포털이
 * 파일을 재게시했을 때 한쪽만 고쳐진다. 정본은 공유 모듈의 {@link FileDatasetKey#sourceId()} 하나다.
 */
@RequiredArgsConstructor
public enum IncomeSourceDataset {

    NPS_DISTRICT_AVERAGE_INCOME(
        FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME,
        "국민연금공단 자격 시군구 신고 평균소득월액",
        "https://www.data.go.kr/data/3046077/fileData.do");

    private final FileDatasetKey fileDatasetKey;
    private final String label;
    private final String url;

    /** 데이터셋 식별자. batch-service 가 원본 헤더를 대조할 때 쓰는 계약과 같은 값이다. */
    public String getDatasetId() {
        return fileDatasetKey.sourceId();
    }

    /** 이 원천이 대응하는 공유 파일 원천 계약. 적재 축과 조회 축이 같은 상수를 보는지 테스트가 고정한다. */
    public FileDatasetKey getFileDatasetKey() {
        return fileDatasetKey;
    }

    public String getLabel() {
        return label;
    }

    public String getUrl() {
        return url;
    }
}
