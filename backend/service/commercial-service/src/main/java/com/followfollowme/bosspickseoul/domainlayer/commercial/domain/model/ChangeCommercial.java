package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import lombok.Builder;

/**
 * {@code id} 는 레거시 테이블의 surrogate 키다. 데이터셋 릴리스 경로에서 만든 값은 0 이며 식별에 쓰지 않는다 —
 * Presenter 로 내보내려면 먼저 이 필드를 nullable 로 바꾸거나 제거한다(coding-conventions §2-1).
 */
@Builder
public record ChangeCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    String changeIndicatorCode,
    String changeIndicatorName,
    Integer averageOpenedMonths,
    Integer averageClosedMonths
) {

}
