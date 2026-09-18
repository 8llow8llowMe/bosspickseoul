package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

/**
 * 프롬프트에 실을 소비 출처. 값이 이 상권의 실측인지, 소속 행정동을 빌려온 추정치인지, 아예 없는지를
 * LLM 이 알아야 "이 상권의 소비는 ~" 같은 단정을 하지 않는다.
 *
 * <p>{@code disclaimer} 는 원천 서비스가 만든 문장을 그대로 싣는다. 화면과 리포트가 같은 문장을 써야 해서
 * 이 서비스가 문구를 다시 만들지 않는다. 대체·중단일 때만 채워지고 상권 네이티브에서는 null 이다. (이슈 #415)
 */
public record CommercialAiExpenseProvenance(
    String scopeName,
    String areaName,
    String effectivePeriodCode,
    String sourceLabel,
    String disclaimer
) {

}
