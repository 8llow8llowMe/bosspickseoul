package com.followfollowme.nowdoboss.domainlayer.aireport.application.model;

import java.util.List;
import lombok.Builder;

@Builder
public record AdministrationAiSourceData(
    String administrationCode,
    String periodCode,
    String districtCode,
    String districtName,
    String administrationName,
    int commercialCount,
    List<String> commercialSummaries,
    List<String> topSalesServiceSummaries,
    List<String> topStoreServiceSummaries,
    long totalExpenseAmount
) {
}
