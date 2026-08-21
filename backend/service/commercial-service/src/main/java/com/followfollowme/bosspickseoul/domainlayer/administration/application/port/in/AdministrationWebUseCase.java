package com.followfollowme.bosspickseoul.domainlayer.administration.application.port.in;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;

public interface AdministrationWebUseCase {

    AdministrationDetailResponse getAdministrationDetail(String administrationCode, String currentPeriodCode, String previousPeriodCode);
}
