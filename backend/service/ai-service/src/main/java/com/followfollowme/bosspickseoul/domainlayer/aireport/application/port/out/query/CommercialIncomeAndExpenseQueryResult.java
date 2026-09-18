package com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query;

import java.util.List;
import lombok.Builder;

/**
 * 지출은 상권 원천도 대체할 행정동 값도 없는 분기에 {@code expenseCategories} 와 {@code totalExpenseAmount} 가
 * null 이다. 0 으로 채우면 "실제로 0원" 과 구별되지 않으므로 null 을 그대로 통과시킨다. (이슈 #413)
 *
 * <p>항목을 고정 필드로 두지 않는 이유는 스코프마다 구성이 다르기 때문이다(상권 9개 / 행정동 대체 10개).
 * {@code provenance} 는 값이 없을 때도 내려오며, 값이 이 상권의 실측인지 소속 행정동을 빌려온 것인지를
 * 프롬프트가 알아야 해서 함께 싣는다. (이슈 #415)
 */
@Builder
public record CommercialIncomeAndExpenseQueryResult(
    List<CommercialExpenseCategoryQueryResult> expenseCategories,
    Long totalExpenseAmount,
    CommercialExpenseProvenanceQueryResult provenance
) {}
