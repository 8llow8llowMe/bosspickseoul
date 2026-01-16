package com.followfollowme.nowdoboss.domainlayer.commercial.domain.model;

import lombok.Builder;

@Builder
public record FootTrafficCommercial(
    long id,
    String periodCode,
    String commercialClassificationCode,
    String commercialClassificationCodeName,
    String commercialCode,
    String commercialCodeName,
    long totalFootTraffic,
    long maleFootTraffic,
    long femaleFootTraffic,
    long teenFootTraffic,
    long twentyFootTraffic,
    long thirtyFootTraffic,
    long fortyFootTraffic,
    long fiftyFootTraffic,
    long sixtyFootTraffic,
    long footTraffic00,
    long footTraffic06,
    long footTraffic11,
    long footTraffic14,
    long footTraffic17,
    long footTraffic21,
    long monFootTraffic,
    long tueFootTraffic,
    long wedFootTraffic,
    long thuFootTraffic,
    long friFootTraffic,
    long satFootTraffic,
    long sunFootTraffic
) {

}
