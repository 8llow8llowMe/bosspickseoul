package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFacilityQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialIncomeAndExpenseQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialResidentPopulationQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialSalesQueryResult;
import java.lang.reflect.Constructor;
import java.lang.reflect.RecordComponent;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * wire DTO → QueryResult 변환이 말단 필드를 하나도 빠뜨리지 않는지 검사한다.
 *
 * <p><b>왜 필요한가.</b> {@code CommercialAnalysisWireGoldenJsonTest} 는 "peer JSON → wire DTO" 까지만 덮는다.
 * 그 뒤의 "wire DTO → QueryResult" 는 순수 필드 복사라 한 줄만 빠뜨려도 컴파일은 통과하고, 대상 필드가 primitive 라
 * 값이 조용히 0 이 되어 LLM 프롬프트에 잘못된 근거가 들어간다. 변환 누락이 이 리팩토링의 가장 큰 위험이다.
 *
 * <p><b>어떻게 검사하나.</b> wire DTO 트리의 모든 말단 필드에 <b>서로 다른</b> 값을 채워 넣고 변환한 뒤,
 * 양쪽 트리를 {@code 경로 -> 값} 맵으로 펼쳐 비교한다. 값이 전부 다르므로 누락(0 으로 남음)뿐 아니라
 * 필드가 서로 뒤바뀐 경우도 잡힌다. 말단 필드 개수도 함께 못 박아, wire DTO 에 필드를 추가하고 변환을 빠뜨리면
 * 개수 단언에서 먼저 걸린다. 5종의 wire 말단 합계는 102개다(46 + 31 + 11 + 7 + 7).
 *
 * <p><b>1:1 이 아닌 필드가 하나 있다.</b> {@code CommercialResidentPopulationQueryResult.totalResidentPopulationCount}
 * 는 wire 에 같은 이름의 짝이 없는 <b>파생</b> 필드로, {@code byAge.totalResidentPopulation} 에서 온다
 * (peer 응답에 총 상주인구 최상위 키가 없다). 그래서 경로 맵을 그대로 비교하면 안 되고,
 * {@code derivedQueryPathToWirePath} 로 "이 QueryResult 경로는 저 wire 경로에서 파생된다" 를 명시한 뒤
 * 값이 실제로 그 원천과 같은지 따로 단언하고, 나머지 필드에만 1:1 비교를 적용한다.
 * 파생 목록에 없는 필드가 QueryResult 에만 있으면 1:1 비교에서 걸린다.
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
    @DisplayName("wire DTO 자체가 null 이면 null 을 돌려준다")
    void nullWireStaysNull() {
        assertThat(CommercialAnalysisWireMapper.toQueryResult((CommercialSalesClientResponse) null)).isNull();
    }

    private static void assertEveryLeafCopied(
        Class<?> wireType, Class<?> queryType, Function<Object, Object> mapping, int expectedLeafCount
    ) throws Exception {
        assertEveryLeafCopied(wireType, queryType, mapping, expectedLeafCount, Map.of());
    }

    /**
     * @param expectedLeafCount wire DTO 트리의 말단 필드 개수
     * @param derivedQueryPathToWirePath wire 에 같은 경로의 짝이 없는 QueryResult 필드 → 그 값을 파생시킨 wire 경로.
     *                                   여기 적힌 필드는 원천과 값이 같은지 따로 단언한 뒤 1:1 비교에서 제외한다.
     */
    private static void assertEveryLeafCopied(
        Class<?> wireType, Class<?> queryType, Function<Object, Object> mapping, int expectedLeafCount,
        Map<String, String> derivedQueryPathToWirePath
    ) throws Exception {
        AtomicLong sequence = new AtomicLong(1);
        Object wire = instantiateWithDistinctValues(wireType, sequence);

        Object queryResult = mapping.apply(wire);

        assertThat(queryResult).isInstanceOf(queryType);

        Map<String, Object> wireLeaves = flattenLeaves(wire, "");
        Map<String, Object> queryLeaves = new LinkedHashMap<>(flattenLeaves(queryResult, ""));

        assertThat(wireLeaves).hasSize(expectedLeafCount);

        derivedQueryPathToWirePath.forEach((queryPath, wirePath) -> {
            assertThat(wireLeaves).containsKey(wirePath);
            // 값이 필드마다 전부 다르므로, 같다는 것은 곧 "지정한 원천에서 왔다" 는 뜻이다.
            assertThat(queryLeaves).containsEntry(queryPath, wireLeaves.get(wirePath));
            queryLeaves.remove(queryPath);
        });

        // 파생 필드를 뺀 나머지는 경로 이름과 값이 모두 같아야 한다. 빠뜨린 필드는 값 불일치(0 또는 0.0)로,
        // 구조 변경이나 신고되지 않은 파생 필드는 키 불일치로 드러난다.
        assertThat(queryLeaves).isEqualTo(wireLeaves);
    }

    private static Object instantiateWithDistinctValues(Class<?> recordType, AtomicLong sequence) throws Exception {
        RecordComponent[] components = recordType.getRecordComponents();
        Class<?>[] parameterTypes = new Class<?>[components.length];
        Object[] arguments = new Object[components.length];

        for (int index = 0; index < components.length; index++) {
            Class<?> componentType = components[index].getType();
            parameterTypes[index] = componentType;
            arguments[index] = componentType.isRecord()
                ? instantiateWithDistinctValues(componentType, sequence)
                : distinctValue(componentType, sequence);
        }

        Constructor<?> canonicalConstructor = recordType.getDeclaredConstructor(parameterTypes);
        canonicalConstructor.setAccessible(true);
        return canonicalConstructor.newInstance(arguments);
    }

    private static Object distinctValue(Class<?> componentType, AtomicLong sequence) {
        long next = sequence.getAndIncrement();
        if (componentType == long.class) {
            return next;
        }
        if (componentType == int.class) {
            return (int) next;
        }
        if (componentType == double.class) {
            // 정수부만으로도 서로 다르지만, long 값과 섞이지 않게 소수부를 붙인다.
            return next + 0.5d;
        }
        throw new IllegalStateException("이 테스트가 값을 만들 줄 모르는 wire 필드 타입이다: " + componentType.getName());
    }

    private static Map<String, Object> flattenLeaves(Object record, String prefix) throws Exception {
        Map<String, Object> leaves = new LinkedHashMap<>();
        for (RecordComponent component : record.getClass().getRecordComponents()) {
            Object value = component.getAccessor().invoke(record);
            String path = prefix.isEmpty() ? component.getName() : prefix + "." + component.getName();
            if (component.getType().isRecord()) {
                leaves.putAll(flattenLeaves(value, path));
            } else {
                leaves.put(path, value);
            }
        }
        return leaves;
    }
}
