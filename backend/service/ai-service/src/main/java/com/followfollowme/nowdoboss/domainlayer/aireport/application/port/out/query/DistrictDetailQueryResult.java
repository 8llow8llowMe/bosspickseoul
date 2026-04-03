package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

import java.util.List;

public record DistrictChangeIndicatorQueryResult(
    String changeIndicatorCode,
    String changeIndicatorName,
    int averageOpenedMonths,
    int averageClosedMonths
) {

}

record DistrictPeriodFootTrafficQueryResult(String periodCode, long totalFootTraffic) {}

record DistrictTimeSlotFootTrafficQueryResult(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24,
    String dominantTimeSlotType
) {}

record DistrictGenderFootTrafficQueryResult(long maleFootTraffic, long femaleFootTraffic, String dominantGenderType) {}

record DistrictAgeGroupFootTrafficQueryResult(
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic,
    String dominantAgeGroupType
) {}

record DistrictDayOfWeekFootTrafficQueryResult(
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic,
    String dominantDayOfWeekType
) {}

record DistrictFootTrafficDetailQueryResult(
    String periodTrend,
    List<DistrictPeriodFootTrafficQueryResult> periodTotalFootTrafficList,
    DistrictTimeSlotFootTrafficQueryResult timeSlot,
    DistrictGenderFootTrafficQueryResult gender,
    DistrictAgeGroupFootTrafficQueryResult ageGroup,
    DistrictDayOfWeekFootTrafficQueryResult dayOfWeek
) {}

record DistrictStoreServiceTopQueryResult(String serviceCode, String serviceName, long totalStoreCount) {}

record DistrictOpenedStoreAdministrationTopQueryResult(String administrationCode, String administrationName, long openedStoreCount, double openingRate) {}

record DistrictClosedStoreAdministrationTopQueryResult(String administrationCode, String administrationName, long closedStoreCount, double closureRate) {}

record DistrictStoreDetailQueryResult(
    List<DistrictStoreServiceTopQueryResult> topStoreServices,
    List<DistrictOpenedStoreAdministrationTopQueryResult> topOpenedAdministrations,
    List<DistrictClosedStoreAdministrationTopQueryResult> topClosedAdministrations
) {}

record DistrictSalesServiceTopQueryResult(String serviceCode, String serviceName, double salesChangeRate) {}

record DistrictSalesAdministrationTopQueryResult(String administrationCode, String administrationName, long totalSalesAmount, double salesChangeRate) {}

record DistrictSalesDetailQueryResult(
    List<DistrictSalesServiceTopQueryResult> topSalesServices,
    List<DistrictSalesAdministrationTopQueryResult> topSalesAdministrations
) {}

public record DistrictDetailQueryResult(
    DistrictChangeIndicatorQueryResult changeIndicator,
    DistrictFootTrafficDetailQueryResult footTraffic,
    DistrictStoreDetailQueryResult store,
    DistrictSalesDetailQueryResult sales
) {

}
