package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model;

/**
 * Spring Batch Job 1회 실행 결과. {@code failure} 는 운영자용 요약이며 JDBC URL·API 키를 담지 않는다.
 *
 * @param serviceTypeUnresolvedRows typed 이관에서만 의미가 있다. 사실 적재는 0 이다
 */
public record ImportExecution(boolean completed, String status, String failure, int serviceTypeUnresolvedRows) {

    public static ImportExecution completed(int serviceTypeUnresolvedRows) {
        return new ImportExecution(true, "COMPLETED", null, serviceTypeUnresolvedRows);
    }

    public static ImportExecution failed(String status, String failure) {
        return new ImportExecution(false, status, failure, 0);
    }
}
