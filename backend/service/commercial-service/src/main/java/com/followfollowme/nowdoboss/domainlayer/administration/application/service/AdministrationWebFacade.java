package com.followfollowme.nowdoboss.domainlayer.administration.application.service;

import com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.dto.response.AdministrationDetailResponse;
import com.followfollowme.nowdoboss.domainlayer.administration.adapter.in.web.presenter.AdministrationPresenter;
import com.followfollowme.nowdoboss.domainlayer.administration.application.info.AdministrationDetailInfo;
import com.followfollowme.nowdoboss.domainlayer.administration.application.port.in.AdministrationWebUseCase;
import com.followfollowme.nowdoboss.domainlayer.administration.application.service.processor.AdministrationQueryProcessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdministrationWebFacade implements AdministrationWebUseCase {

    private final AdministrationQueryProcessor administrationQueryProcessor;
    private final AdministrationPresenter administrationPresenter;

    @Override
    public AdministrationDetailResponse getAdministrationDetail(
        String administrationCode, String currentPeriodCode, String previousPeriodCode
    ) {
        AdministrationDetailInfo info = administrationQueryProcessor.getAdministrationDetail(
            administrationCode, currentPeriodCode, previousPeriodCode);
        return administrationPresenter.toAdministrationDetailResponse(info);
    }
}
