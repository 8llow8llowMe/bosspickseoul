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
 *
 * <p>끊긴 상권 소득 자리에는 자치구 평균 소득(대체) {@code districtAverageIncome} 이 붙었다. peer 는 값이 없어도 이 블록을
 * 채워 보내지만, 이 필드를 모르는 이전 commercial-service 는 키 자체를 내려보내지 않는다. 그때는 null 로 바인딩되고
 * (누락 키는 역직렬화 실패가 아니다) 프롬프트가 결측 표기를 쓴다. 그래서 두 서비스의 배포 순서에 매이지 않는다. (이슈 #415)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CommercialIncomeAndExpenseClientResponse(
    List<CommercialExpenseCategoryClientResponse> expenseCategories,
    Long totalExpenseAmount,
    CommercialExpenseProvenanceClientResponse provenance,
    CommercialDistrictAverageIncomeClientResponse districtAverageIncome
) {

}
