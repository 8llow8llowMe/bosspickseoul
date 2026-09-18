package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/**
 * {@code GET /api/v1/commercials/{commercialCode}/income} 응답 본문의 wire 표현.
 *
 * <p>원천이 상권 단위 월 평균 소득 제공을 중단해 peer 가 {@code averageIncomeItem} 을 더 이상 내려보내지 않는다.
 * (이슈 #413)
 *
 * <p>지출은 고정 필드 객체({@code expenseByCategoryItem})가 사라지고 항목 배열로 바뀌었다. 상권 네이티브는
 * 여가·문화가 나뉜 9항목, 행정동 대체는 합산된 여가·문화에 기타·음식이 더해진 10항목이라 항목 수가 스코프마다
 * 다르기 때문이다. 항목 키를 아는 책임이 이 서비스에 없으므로 배열을 순서대로 다룬다.
 * {@code provenance} 는 값이 없을 때도 내려오므로 항상 non-null 로 본다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialIncomeAndExpenseClientResponse(
    List<CommercialExpenseCategoryClientResponse> expenseCategories,
    Long totalExpenseAmount,
    CommercialExpenseProvenanceClientResponse provenance
) {

}
