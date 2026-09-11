package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 업종 코드를 {@code service_type} enum 이름으로 해석한다.
 *
 * <p>매핑은 이관 run 시작 시 {@code service_category} 를 1회 읽은 스냅샷이다. 행마다 다시 조회하지 않는다.
 * 매핑에 없는 코드는 {@code null} 컬럼으로 두되 조용히 넘기지 않도록 실패 행 수와 서로 다른 코드를 모아
 * run 완료 로그에 남긴다. 미매핑이 있다고 이관 자체를 실패시키지는 않는다.
 *
 * <p>run 단위로 새로 만들어 한 스레드가 순차로 쓰는 수집기다. 공유하거나 재사용하지 않는다.
 */
public final class ServiceTypeResolver {

    /** 로그 한 줄이 감당할 만큼만 남긴다. 전체 개수는 따로 집계한다. */
    static final int UNRESOLVED_SAMPLE_LIMIT = 10;

    private static final String BLANK_CODE = "(blank)";

    private final Map<String, String> serviceTypesByServiceCode;
    private final Set<String> unresolvedCodes = new LinkedHashSet<>();
    private int unresolvedRows;

    public ServiceTypeResolver(Map<String, String> serviceTypesByServiceCode) {
        this.serviceTypesByServiceCode = Map.copyOf(serviceTypesByServiceCode);
    }

    /** 업종 컬럼이 없는 데이터셋용. 매핑 테이블을 읽지 않는다. */
    public static ServiceTypeResolver empty() {
        return new ServiceTypeResolver(Map.of());
    }

    String resolve(String serviceCode) {
        String serviceType = serviceCode == null ? null : serviceTypesByServiceCode.get(serviceCode);
        if (serviceType != null) {
            return serviceType;
        }
        unresolvedRows++;
        unresolvedCodes.add(serviceCode == null || serviceCode.isBlank() ? BLANK_CODE : serviceCode);
        return null;
    }

    public int unresolvedRows() {
        return unresolvedRows;
    }

    public int unresolvedCodeCount() {
        return unresolvedCodes.size();
    }

    public List<String> unresolvedCodeSample() {
        return unresolvedCodes.stream().limit(UNRESOLVED_SAMPLE_LIMIT).toList();
    }
}
