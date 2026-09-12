package com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model;

/**
 * {@link AiReportJob#requestParams()} 의 키 계약.
 *
 * <p>쓰는 쪽(제출 Processor)과 읽는 쪽(워커·상태 조회)이 서로 다른 클래스라 리터럴로 두면 오타가 컴파일에
 * 걸리지 않고, 값이 null 이 되어 런타임에야 드러난다. 여기 한 곳으로 모은다.
 *
 * <p><b>값 자체는 Redis 에 저장된 잡 JSON 의 키로 그대로 나간다.</b> 상수명은 바꿔도 되지만 문자열 값을 바꾸면
 * 이미 저장된 잡(TTL 24h)을 읽지 못하고, 요청 해시(requestHash)까지 달라져 멱등 키가 갈라진다.
 */
public final class AiReportJobParamKeys {

    public static final String COMMERCIAL_CODE = "commercialCode";
    public static final String LEFT_COMMERCIAL_CODE = "leftCommercialCode";
    public static final String RIGHT_COMMERCIAL_CODE = "rightCommercialCode";
    public static final String DISTRICT_CODE = "districtCode";
    public static final String ADMINISTRATION_CODE = "administrationCode";
    public static final String SERVICE_CODE = "serviceCode";
    public static final String PERIOD_CODE = "periodCode";

    private AiReportJobParamKeys() {
    }
}
