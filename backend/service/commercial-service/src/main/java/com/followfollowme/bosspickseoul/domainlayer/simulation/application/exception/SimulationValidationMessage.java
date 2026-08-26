package com.followfollowme.bosspickseoul.domainlayer.simulation.application.exception;

/**
 * 요청 필드 검증 메시지. coding-conventions §8-2 에 따라 "CODE:사용자 메시지" 형식으로 정의해
 * ValidationErrorSupport 가 필드별 오류 코드를 분리해 내려줄 수 있게 한다.
 */
public final class SimulationValidationMessage {

    public static final String FRANCHISEE_REQUIRED = "SIMULATION_101:프랜차이즈 여부는 필수입니다.";
    public static final String DISTRICT_CODE_REQUIRED = "SIMULATION_102:자치구 코드는 필수입니다.";
    public static final String SERVICE_CODE_REQUIRED = "SIMULATION_103:서비스 업종 코드는 필수입니다.";
    public static final String STORE_SIZE_POSITIVE = "SIMULATION_104:매장 면적(㎡)은 1 이상이어야 합니다.";
    public static final String FLOOR_TYPE_REQUIRED = "SIMULATION_105:층 구분은 필수입니다.";
    public static final String PERIOD_CODE_PATTERN = "SIMULATION_106:기준 분기 코드는 yyyyQ(예: 20233) 형식이어야 합니다.";
    public static final String TOTAL_PRICE_POSITIVE = "SIMULATION_107:총 창업 비용(만원)은 0 이상이어야 합니다.";
    public static final String PAGE_INVALID = "SIMULATION_108:페이지는 0 이상이어야 합니다.";
    public static final String PAGE_SIZE_INVALID = "SIMULATION_109:페이지 크기는 1 이상 50 이하만 가능합니다.";

    private SimulationValidationMessage() {
    }
}
