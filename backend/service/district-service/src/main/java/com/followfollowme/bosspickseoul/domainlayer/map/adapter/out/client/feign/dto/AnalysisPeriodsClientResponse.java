package com.followfollowme.bosspickseoul.domainlayer.map.adapter.out.client.feign.dto;

/**
 * commercial-service {@code GET /api/v1/commercials/periods} 응답의 wire DTO(이슈 #464). 지도가 쓰는 기본 분기만 받고 나머지 필드는
 * 역직렬화에서 무시된다. adapter 밖으로 나가지 않는다 — 어댑터가 문자열만 꺼내 포트로 돌려준다.
 */
public record AnalysisPeriodsClientResponse(String defaultPeriodCode) {

}
