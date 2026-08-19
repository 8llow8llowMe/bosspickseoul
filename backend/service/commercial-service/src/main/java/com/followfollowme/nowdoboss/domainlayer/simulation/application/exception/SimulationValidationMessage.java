package com.followfollowme.nowdoboss.domainlayer.simulation.application.exception;

public final class SimulationValidationMessage {

    public static final String FRANCHISEE_REQUIRED = "프랜차이즈 여부는 필수입니다.";
    public static final String DISTRICT_CODE_REQUIRED = "자치구 코드는 필수입니다.";
    public static final String SERVICE_CODE_REQUIRED = "서비스 업종 코드는 필수입니다.";
    public static final String STORE_SIZE_POSITIVE = "매장 면적(㎡)은 1 이상이어야 합니다.";
    public static final String FLOOR_TYPE_REQUIRED = "층 구분은 필수입니다.";
    public static final String PERIOD_CODE_PATTERN = "기준 분기 코드는 yyyyQ(예: 20233) 형식이어야 합니다.";
    public static final String TOTAL_PRICE_POSITIVE = "총 창업 비용(만원)은 0 이상이어야 합니다.";

    private SimulationValidationMessage() {
    }
}
