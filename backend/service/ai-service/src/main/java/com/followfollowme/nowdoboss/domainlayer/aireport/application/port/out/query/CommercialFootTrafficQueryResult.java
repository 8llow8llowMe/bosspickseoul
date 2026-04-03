package com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query;

public record CommercialFootTrafficQueryResult(
    CommercialFootTrafficByTimeSlotQueryResult byTimeSlotItem,
    CommercialFootTrafficByDayOfWeekQueryResult byDayOfWeekItem,
    CommercialFootTrafficByAgeGroupQueryResult byAgeGroupItem,
    CommercialFootTrafficByAgeGenderPercentQueryResult byAgeGenderPercentItem
) {

}

record CommercialFootTrafficByTimeSlotQueryResult(
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24
) {}

record CommercialFootTrafficByDayOfWeekQueryResult(
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic
) {}

record CommercialFootTrafficByAgeGroupQueryResult(
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic
) {}

record CommercialFootTrafficByAgeGenderPercentQueryResult(
    double maleAge10Percent,
    double femaleAge10Percent,
    double maleAge20Percent,
    double femaleAge20Percent,
    double maleAge30Percent,
    double femaleAge30Percent,
    double maleAge40Percent,
    double femaleAge40Percent,
    double maleAge50Percent,
    double femaleAge50Percent,
    double maleAge60PlusPercent,
    double femaleAge60PlusPercent
) {}
