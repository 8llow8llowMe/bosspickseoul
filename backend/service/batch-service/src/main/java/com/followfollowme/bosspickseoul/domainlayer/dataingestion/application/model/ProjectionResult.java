package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/**
 * @param serviceTypeUnresolvedRows {@code service_category} 로 업종 분류를 찾지 못해 {@code service_type} 을 NULL 로 넣은 행 수.
 *                                  게시를 막지 않는다. 자동 최신화가 WARN 로그와 메트릭으로 드러낸다.
 */
public record ProjectionResult(String sourceRunId, int rowCount, boolean written, int serviceTypeUnresolvedRows) {
}
