package com.followfollowme.nowdoboss.domainlayer.map.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query.CandidateCommercialsQueryResult;
import java.util.List;

public interface CommercialCandidateQueryPort {

    CandidateCommercialsQueryResult getTopCandidates(
        List<String> commercialCodes,
        String serviceCode,
        String preset,
        String priorityMetric,
        Integer topN,
        String periodCode
    );
}
