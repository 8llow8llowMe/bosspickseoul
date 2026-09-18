package com.followfollowme.bosspickseoul.domainlayer.aireport.application.model;

/**
 * 프롬프트에 적을 소비 항목 하나. 항목 수와 이름이 스코프마다 달라(상권 9개 / 행정동 대체 10개) 고정 필드로
 * 둘 수 없으므로 배열 원소로 든다.
 *
 * <p>라벨은 원천 서비스가 내려보낸 문구를 그대로 쓴다. 이 서비스가 키를 보고 문구를 다시 만들면 화면과
 * 리포트가 같은 항목을 다르게 부르게 되고, 원천에 새 항목이 생길 때마다 여기가 먼저 깨진다. (이슈 #415)
 */
public record CommercialAiExpenseCategory(
    String label,
    long amount
) {

}
