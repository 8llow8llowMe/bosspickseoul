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
 * 개수 단언에서 먼저 걸린다. 5종 합계는 골든 테스트가 단언하는 103개와 같다(46 + 31 + 11 + 7 + 8).
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
    @DisplayName("상주인구 wire DTO 의 말단 필드 8개가 모두 QueryResult 로 옮겨진다")
    void residentPopulationMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            CommercialResidentPopulationClientResponse.class,
            CommercialResidentPopulationQueryResult.class,
            wire -> CommercialAnalysisWireMapper.toQueryResult((CommercialResidentPopulationClientResponse) wire),
            8
        );
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
        AtomicLong sequence = new AtomicLong(1);
        Object wire = instantiateWithDistinctValues(wireType, sequence);

        Object queryResult = mapping.apply(wire);

        assertThat(queryResult).isInstanceOf(queryType);

        Map<String, Object> wireLeaves = flattenLeaves(wire, "");
        Map<String, Object> queryLeaves = flattenLeaves(queryResult, "");

        assertThat(wireLeaves).hasSize(expectedLeafCount);
        // 경로 이름과 값이 모두 같아야 한다. 빠뜨린 필드는 값 불일치(0 또는 0.0)로, 구조 변경은 키 불일치로 드러난다.
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
