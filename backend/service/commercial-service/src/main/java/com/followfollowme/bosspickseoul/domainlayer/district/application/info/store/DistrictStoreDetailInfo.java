package com.followfollowme.bosspickseoul.domainlayer.district.application.info.store;

import java.util.List;
import lombok.Builder;

@Builder
public record DistrictStoreDetailInfo(
    // 실제로 조회한 분기. 요청이 분기를 생략하면 서버가 정한 기본 분기다(이슈 #464).
    String currentPeriodCode,
    List<DistrictStoreServiceTopInfo> topStoreServices,
    List<DistrictOpenedStoreAdministrationTopInfo> topOpenedAdministrations,
    List<DistrictClosedStoreAdministrationTopInfo> topClosedAdministrations
) {

}

