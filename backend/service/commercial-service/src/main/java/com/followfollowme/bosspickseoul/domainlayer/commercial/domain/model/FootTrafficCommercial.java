package com.followfollowme.bosspickseoul.domainlayer.commercial.domain.model;

import lombok.Builder;

/**
 * {@code id} 는 레거시 테이블의 surrogate 키다. 데이터셋 릴리스 경로에서 만든 값은 0 이며 식별에 쓰지 않는다 —
 * Presenter 로 내보내려면 먼저 이 필드를 nullable 로 바꾸거나 제거한다(coding-conventions §2-1).
 */
@Builder
public record FootTrafficCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationName,
    String commercialCode,
    String commercialName,
    long totalFootTraffic,
    long maleFootTraffic,
    long femaleFootTraffic,
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic,
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24,
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic
) {

}
