package com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.presenter;

import com.followfollowme.nowdoboss.domainlayer.commercial.adapter.in.web.dto.response.CommercialServiceCategoryResponse;
import com.followfollowme.nowdoboss.domainlayer.commercial.application.info.CommercialServiceCategoryInfo;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CommercialPresenter {

    public CommercialServiceCategoryResponse toServiceCategoryResponse(CommercialServiceCategoryInfo info) {
        return CommercialServiceCategoryResponse.builder()
            .serviceCode(info.serviceCode())
            .serviceCodeName(info.serviceCodeName())
            .serviceTypeCode(info.serviceType().name())
            .serviceTypeDescription(info.serviceType().getDescription())
            .build();
    }

    public List<CommercialServiceCategoryResponse> toServiceCategoryResponses(List<CommercialServiceCategoryInfo> infos) {
        return infos.stream()
            .map(this::toServiceCategoryResponse)
            .toList();
    }
}
