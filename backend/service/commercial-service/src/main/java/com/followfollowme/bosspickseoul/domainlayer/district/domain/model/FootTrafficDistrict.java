package com.followfollowme.bosspickseoul.domainlayer.district.domain.model;

import lombok.Builder;

@Builder
public record FootTrafficDistrict(
    long id,
    String periodCode,
    String districtCode,
    String districtName,
    long totalFootTraffic,
    long maleFootTraffic,
    long femaleFootTraffic,
    long age10FootTraffic,
    long age20FootTraffic,
    long age30FootTraffic,
    long age40FootTraffic,
    long age50FootTraffic,
    long age60PlusFootTraffic,
    long footTrafficTime00To06,
    long footTrafficTime06To11,
    long footTrafficTime11To14,
    long footTrafficTime14To17,
    long footTrafficTime17To21,
    long footTrafficTime21To24,
    long mondayFootTraffic,
    long tuesdayFootTraffic,
    long wednesdayFootTraffic,
    long thursdayFootTraffic,
    long fridayFootTraffic,
    long saturdayFootTraffic,
    long sundayFootTraffic
) {

}
