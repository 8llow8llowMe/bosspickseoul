package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * {@code GET /api/v1/administrations/{administrationCode}} 응답 본문의 wire 표현.
 *
 * <p>commercial-service 의 {@code AdministrationDetailResponse} 와 1:1 이다. alias 는 없고 필드명이 같아서
 * 바인딩된다. 그 필드명을 아는 책임은 이 어댑터 계층 타입에만 있고,
 * {@code application/port/out/query} 의 QueryResult 는 알지 않는다. peer 가 응답 필드명을 바꾸면
 * 여기에 {@code @JsonProperty} 를 붙여 흡수하면 된다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AdministrationDetailClientResponse(
    String administrationCode,
    String administrationName,
    AdministrationSalesDetailClientResponse sales,
    AdministrationStoreDetailClientResponse store,
    AdministrationIncomeDetailClientResponse income
) {

}
