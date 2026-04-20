package com.followfollowme.nowdoboss.domainlayer.map.application.port.out.query;

import java.util.List;

public record CandidateCommercialsQueryResult(
    List<CandidateCommercialQueryResult> items
) {

}
