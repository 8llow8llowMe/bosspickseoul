package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import static com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.WireMapperLeafAssertions.assertEveryLeafCopied;
import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesSummaryQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialStoreAnalysisQueryResult;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@link CommercialAnalysisWireMapper} 의 변환이 말단 필드를 하나도 빠뜨리지 않는지 검사한다.
 *
 * <p>검사 방식(말단 필드마다 서로 다른 값을 채우고 경로-값 맵으로 펼쳐 비교)과 그 이유는
 * {@code WireMapperLeafAssertions} 에 정리해 두었다.
 *
 * <p><b>1:1 이 아닌 필드가 하나 있다.</b> {@code CommercialResidentPopulationQueryResult.totalResidentPopulationCount}
 * 는 wire 에 같은 이름의 짝이 없는 <b>파생</b> 필드로, {@code byAge.totalResidentPopulation} 에서 온다
 * (peer 응답에 총 상주인구 최상위 키가 없다). 그래서 경로 맵을 그대로 비교하면 안 되고,
 * "이 QueryResult 경로는 저 wire 경로에서 파생된다" 를 명시한 뒤 값이 실제로 그 원천과 같은지 따로 단언하고,
 * 나머지 필드에만 1:1 비교를 적용한다. 파생 목록에 없는 필드가 QueryResult 에만 있으면 1:1 비교에서 걸린다.
 */
class CommercialAnalysisWireMapperTest {

    @Test
    @DisplayName("매출 wire DTO 의 말단 필드 46개가 모두 QueryResult 로 옮겨진다")
    void salesMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            CommercialSalesClientResponse.class,
            CommercialSalesQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialSalesClientResponse) wire),
            46
        );
    }

    @Test
    @DisplayName("유동인구 wire DTO 의 말단 필드 31개가 모두 QueryResult 로 옮겨진다")
    void footTrafficMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            CommercialFootTrafficClientResponse.class,
            CommercialFootTrafficQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialFootTrafficClientResponse) wire),
            31
        );
    }

    @Test
    @DisplayName("소득·지출 wire DTO 의 말단 필드 11개가 모두 QueryResult 로 옮겨진다")
    void incomeAndExpenseMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            CommercialIncomeAndExpenseClientResponse.class,
            CommercialIncomeAndExpenseQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialIncomeAndExpenseClientResponse) wire),
            11
        );
    }

    @Test
    @DisplayName("집객시설 wire DTO 의 말단 필드 7개가 모두 QueryResult 로 옮겨진다")
    void facilityMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            CommercialFacilityClientResponse.class,
            CommercialFacilityQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialFacilityClientResponse) wire),
            7
        );
    }

    @Test
    @DisplayName("상주인구 wire DTO 의 말단 필드 7개가 모두 옮겨지고, totalResidentPopulationCount 는 byAge 에서 파생된다")
    void residentPopulationMapsEveryLeafFieldAndDerivesTotalCount() throws Exception {
        assertEveryLeafCopied(
            CommercialResidentPopulationClientResponse.class,
            CommercialResidentPopulationQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialResidentPopulationClientResponse) wire),
            7,
            Map.of("totalResidentPopulationCount", "byAge.totalResidentPopulation")
        );
    }

    @Test
    @DisplayName("점포 분석 wire DTO 의 말단 필드 17개가 모두 QueryResult 로 옮겨진다")
    void storeAnalysisMapsEveryLeafField() throws Exception {
        // 7개는 최상위, 10개는 peerStores 원소 2개 × 5필드다. 리스트 원소도 경로에 인덱스가 붙어 함께 대조된다.
        assertEveryLeafCopied(
            CommercialStoreAnalysisClientResponse.class,
            CommercialStoreAnalysisQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialStoreAnalysisClientResponse) wire),
            17
        );
    }

    @Test
    @DisplayName("매출 요약 wire DTO 의 말단 필드 15개가 모두 QueryResult 로 옮겨진다")
    void salesSummaryMapsEveryLeafField() throws Exception {
        // district / administration / commercial 세 블록이 같은 모양이라, 블록끼리 뒤바뀌면 값 불일치로 걸린다.
        assertEveryLeafCopied(
            CommercialSalesSummaryClientResponse.class,
            CommercialSalesSummaryQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialSalesSummaryClientResponse) wire),
            15
        );
    }

    @Test
    @DisplayName("지출 요약 wire DTO 의 말단 필드 9개가 모두 QueryResult 로 옮겨진다")
    void incomeSummaryMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            CommercialIncomeSummaryClientResponse.class,
            CommercialIncomeSummaryQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialIncomeSummaryClientResponse) wire),
            9
        );
    }

    @Test
    @DisplayName("총 상주인구는 byAgeItem.totalResidentPopulation 값을 그대로 쓴다")
    void totalResidentPopulationCountComesFromByAge() {
        CommercialResidentPopulationClientResponse wire = new CommercialResidentPopulationClientResponse(
            new CommercialResidentPopulationByAgeClientResponse(5101L, 5102L, 5103L, 5104L, 5105L, 5106L, 5107L)
        );

        CommercialResidentPopulationQueryResult queryResult = CommercialAnalysisWireMapper.toQueryResult(wire);

        // 예전에는 peer 에 없는 최상위 키를 읽으려다 항상 0 이 되어 "총 상주인구 0" 이 LLM 프롬프트로 들어갔다.
        assertThat(queryResult.totalResidentPopulationCount()).isEqualTo(5101L);
        assertThat(queryResult.byAge().totalResidentPopulation()).isEqualTo(5101L);
    }

    @Test
    @DisplayName("peer 가 byAgeItem 을 생략하면 파생시킬 원천이 없으므로 총 상주인구는 0 이 된다")
    void totalResidentPopulationCountIsZeroWhenByAgeIsMissing() {
        CommercialResidentPopulationClientResponse wire = new CommercialResidentPopulationClientResponse(null);

        CommercialResidentPopulationQueryResult queryResult = CommercialAnalysisWireMapper.toQueryResult(wire);

        // primitive long 이라 "모름" 을 표현할 수 없고 매퍼가 숫자를 지어내서도 안 된다. byAge 자체는 null 을 그대로 통과시켜
        // 값이 없다는 사실이 AiReportProcessor 의 byAge() 역참조 지점에서 NPE 로 드러나게 둔다.
        assertThat(queryResult.byAge()).isNull();
        assertThat(queryResult.totalResidentPopulationCount()).isZero();
    }

    @Test
    @DisplayName("peer 가 중첩 블록을 생략하면 null 이 그대로 전달된다(기존 역직렬화 동작과 같다)")
    void nullNestedBlockStaysNull() {
        CommercialFacilityClientResponse wire = new CommercialFacilityClientResponse(11L, null, 22L);

        CommercialFacilityQueryResult queryResult = CommercialAnalysisWireMapper.toQueryResult(wire);

        assertThat(queryResult.schoolCount()).isNull();
        assertThat(queryResult.totalFacilityCount()).isEqualTo(11L);
        assertThat(queryResult.totalTransportationFacilityCount()).isEqualTo(22L);
    }

    @Test
    @DisplayName("peer 가 peerStores 를 생략하면 null 이 그대로 전달된다")
    void nullPeerStoresStaysNull() {
        CommercialStoreAnalysisClientResponse wire = new CommercialStoreAnalysisClientResponse(1L, 2L, 3.5, 4L, 5.5, 6L, 7L, null);

        CommercialStoreAnalysisQueryResult queryResult = CommercialAnalysisWireMapper.toQueryResult(wire);

        // 빈 리스트로 바꾸면 "peer 가 값을 안 줬다" 와 "peer 가 빈 목록을 줬다" 가 구별되지 않는다.
        assertThat(queryResult.peerStores()).isNull();
        assertThat(queryResult.totalStoreCount()).isEqualTo(1L);
        assertThat(queryResult.franchiseStoreCount()).isEqualTo(7L);
    }

    @Test
    @DisplayName("wire DTO 자체가 null 이면 null 을 돌려준다")
    void nullWireStaysNull() {
        assertThat(CommercialAnalysisWireMapper.toQueryResult((CommercialSalesClientResponse) null)).isNull();
        assertThat(CommercialAnalysisWireMapper.toQueryResult((CommercialStoreAnalysisClientResponse) null)).isNull();
        assertThat(CommercialAnalysisWireMapper.toQueryResult((CommercialSalesSummaryClientResponse) null)).isNull();
        assertThat(CommercialAnalysisWireMapper.toQueryResult((CommercialIncomeSummaryClientResponse) null)).isNull();
    }
}
