package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import lombok.Builder;

@Builder
public record CommercialSalesByAgeQueryResult(
    long age10SalesAmount,
    long age20SalesAmount,
    long age30SalesAmount,
    long age40SalesAmount,
    long age50SalesAmount,
    long age60PlusSalesAmount
) {

}

