package com.followfollowme.nowdoboss.domainlayer.map.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialComparePreviewQueryResult;
import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CommercialProfileQueryResult;

public interface CommercialProfileQueryPort {

    CommercialProfileQueryResult getCommercialProfile(String commercialCode, String serviceCode, String periodCode);

    CommercialComparePreviewQueryResult getCommercialComparePreview(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    );
}
