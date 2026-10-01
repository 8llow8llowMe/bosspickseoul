package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

/**
 * 프롬프트에 실을 자치구 평균 소득(대체)의 출처. 이 값은 상권이나 주민 전체의 소득이 아니라 소속 자치구 국민연금
 * 지역가입자의 신고 평균이고, 같은 자치구 안의 상권은 모두 같은 값이다. LLM 이 그 사실을 알아야 "이 상권의 소득은 ~" 같은
 * 단정이나 상권 간 비교를 하지 않는다.
 *
 * <p>소비 출처({@link CommercialAiExpenseProvenance})와 나눈 이유는 기준 단위가 달라서다(분기 코드 대 기준일). 스코프 이름은
 * 담지 않는다. 프롬프트 줄 이름이 이미 「자치구 평균 소득(대체)」로 대체 사실을 밝히고, 값이 없을 때는 결측 표기와 면책
 * 문장이 그 역할을 한다.
 *
 * <p>{@code disclaimer} 는 원천 서비스가 만든 문장을 그대로 싣는다. 화면과 리포트가 같은 문장을 써야 해서 이 서비스가
 * 문구를 다시 만들지 않는다. 자치구 대체와 제공 없음 모두 채워진다. (이슈 #415)
 *
 * @param areaName      값을 실제로 가져온 자치구 이름. 값이 없으면 null 이다
 * @param referenceDate 값의 기준일(ISO 날짜, 예: {@code 2024-12-31}). 값이 없으면 null 이다
 */
public record CommercialAiIncomeProvenance(
    String areaName,
    String referenceDate,
    String sourceLabel,
    String disclaimer
) {

}
