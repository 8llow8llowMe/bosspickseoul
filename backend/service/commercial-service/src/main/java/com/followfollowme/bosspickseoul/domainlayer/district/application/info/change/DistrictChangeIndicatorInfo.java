package com.followfollowme.bosspickseoul.domainlayer.district.application.info.change;

import lombok.Builder;

@Builder
public record DistrictChangeIndicatorInfo(
    // 실제로 조회한 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String currentPeriodCode,
    // 인기 순위 이벤트에 자치구명을 실어 보내기 위한 필드. 응답 DTO 에는 노출하지 않는다.
    String districtName,
    String changeIndicatorCode,
    String changeIndicatorName,
    int averageOpenedMonths,
    int averageClosedMonths
) {

}

