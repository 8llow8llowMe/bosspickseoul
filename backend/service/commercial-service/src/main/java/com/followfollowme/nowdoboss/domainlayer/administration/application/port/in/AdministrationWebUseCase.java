package com.followfollowme.nowdoboss.domainlayer.administration.application.port.in;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;

public interface AdministrationWebUseCase {

    AdministrationDetailResponse getAdministrationDetail(String administrationCode, String currentPeriodCode, String previousPeriodCode);
}
