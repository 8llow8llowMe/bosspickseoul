package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.district;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import java.lang.reflect.Constructor;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * wire DTO → QueryResult 변환이 말단 필드를 하나도 빠뜨리지 않는지 검사한다.
 *
 * <p><b>왜 필요한가.</b> {@code DistrictAnalysisWireGoldenJsonTest} 는 "peer JSON → wire DTO" 까지만 덮는다.
 * 그 뒤의 "wire DTO → QueryResult" 는 순수 필드 복사라 한 줄만 빠뜨려도 컴파일은 통과하고, 대상 필드가 primitive 라
 * 값이 조용히 0 이 된다. 변환 누락이 이 리팩토링의 가장 큰 위험이다.
 *
 * <p><b>어떻게 검사하나.</b> wire DTO 트리의 모든 말단 필드에 <b>서로 다른</b> 값을 채워 넣고 변환한 뒤,
 * 양쪽 트리를 {@code 경로 -> 값} 맵으로 펼쳐 비교한다. 값이 전부 다르므로 누락(0 또는 null 로 남음)뿐 아니라
 * 필드가 서로 뒤바뀐 경우도 잡힌다. 말단 필드 개수도 함께 못 박아, wire DTO 에 필드를 추가하고 변환을 빠뜨리면
 * 개수 단언에서 먼저 걸린다.
 *
 * <p><b>리스트는 원소를 둘씩 채운다.</b> 경로에 인덱스를 넣어 펼치므로 원소 순서가 뒤집히거나 한 원소만 변환해도
 * 값 불일치로 드러난다. Commercial 계열(PR #386)에는 리스트가 없어서 이 부분이 새로 필요했다.
 *
 * <p>District 계열에는 파생 필드가 없다. 16종 전부 이름·구조가 1:1 이라 경로 맵을 그대로 비교하면 된다.
 */
class DistrictAnalysisWireMapperTest {

    /** 리스트 컴포넌트를 채울 원소 개수. 1 이면 인덱스가 섞이는 실수를 못 잡으므로 2 이상이어야 한다. */
    private static final int LIST_ELEMENT_COUNT = 2;

    @Test
    @DisplayName("자치구 상세 wire DTO 의 말단 필드 80개가 모두 QueryResult 로 옮겨진다")
    void districtDetailMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            DistrictDetailClientResponse.class,
            DistrictDetailQueryResult.class,
            wire -> DistrictAnalysisWireMapper.toQueryResult((DistrictDetailClientResponse) wire),
            80
        );
    }

    @Test
    @DisplayName("자치구 영역 wire DTO 의 말단 필드 2개가 모두 QueryResult 로 옮겨진다")
    void districtAreaMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            DistrictAreaClientResponse.class,
            DistrictAreaQueryResult.class,
            wire -> DistrictAnalysisWireMapper.toQueryResult((DistrictAreaClientResponse) wire),
            2
        );
    }

    @Test
    @DisplayName("peer 가 중첩 블록을 생략하면 null 이 그대로 전달된다(기존 역직렬화 동작과 같다)")
    void nullNestedBlockStaysNull() {
        DistrictDetailClientResponse wire = new DistrictDetailClientResponse(
            new DistrictChangeIndicatorClientResponse("CODE", "NAME", 11, 22),
            null,
            null,
            null
        );

        DistrictDetailQueryResult queryResult = DistrictAnalysisWireMapper.toQueryResult(wire);

        assertThat(queryResult.footTraffic()).isNull();
        assertThat(queryResult.store()).isNull();
        assertThat(queryResult.sales()).isNull();
        assertThat(queryResult.changeIndicator().changeIndicatorCode()).isEqualTo("CODE");
        assertThat(queryResult.changeIndicator().averageOpenedMonths()).isEqualTo(11);
    }

    @Test
    @DisplayName("peer 가 리스트를 생략하면 빈 리스트가 아니라 null 이 그대로 전달된다")
    void nullListStaysNull() {
        // "peer 가 안 내려줬다" 와 "0건이다" 는 다른 사실이다. 어댑터가 빈 리스트로 바꿔 버리면 그 구분이 사라진다.
        DistrictSalesDetailClientResponse wire = new DistrictSalesDetailClientResponse(null, List.of());

        DistrictDetailQueryResult queryResult =
            DistrictAnalysisWireMapper.toQueryResult(new DistrictDetailClientResponse(null, null, null, wire));

        assertThat(queryResult.sales()).isNotNull();
        assertThat(queryResult.sales().topSalesServices()).isNull();
        assertThat(queryResult.sales().topSalesAdministrations()).isEmpty();
    }

    @Test
    @DisplayName("wire DTO 자체가 null 이면 null 을 돌려준다")
    void nullWireStaysNull() {
        assertThat(DistrictAnalysisWireMapper.toQueryResult((DistrictDetailClientResponse) null)).isNull();
        assertThat(DistrictAnalysisWireMapper.toQueryResult((DistrictAreaClientResponse) null)).isNull();
    }

    /**
     * @param expectedLeafCount wire DTO 트리의 말단 필드 개수(리스트는 원소 {@value #LIST_ELEMENT_COUNT}개 기준)
     */
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

        // 경로 이름과 값이 모두 같아야 한다. 빠뜨린 필드는 값 불일치(0 또는 null)로, 구조 변경은 키 불일치로 드러난다.
        assertThat(queryLeaves).isEqualTo(wireLeaves);
    }

    private static Object instantiateWithDistinctValues(Class<?> recordType, AtomicLong sequence) throws Exception {
        RecordComponent[] components = recordType.getRecordComponents();
        Class<?>[] parameterTypes = new Class<?>[components.length];
        Object[] arguments = new Object[components.length];

        for (int index = 0; index < components.length; index++) {
            RecordComponent component = components[index];
            Class<?> componentType = component.getType();
            parameterTypes[index] = componentType;
            if (componentType.isRecord()) {
                arguments[index] = instantiateWithDistinctValues(componentType, sequence);
            } else if (componentType == List.class) {
                arguments[index] = instantiateList(component, sequence);
            } else {
                arguments[index] = distinctValue(componentType, sequence);
            }
        }

        Constructor<?> canonicalConstructor = recordType.getDeclaredConstructor(parameterTypes);
        canonicalConstructor.setAccessible(true);
        return canonicalConstructor.newInstance(arguments);
    }

    private static List<Object> instantiateList(RecordComponent component, AtomicLong sequence) throws Exception {
        Class<?> elementType = listElementType(component);
        List<Object> elements = new ArrayList<>();
        for (int index = 0; index < LIST_ELEMENT_COUNT; index++) {
            elements.add(instantiateWithDistinctValues(elementType, sequence));
        }
        return elements;
    }

    private static Class<?> listElementType(RecordComponent component) {
        if (!(component.getGenericType() instanceof ParameterizedType parameterizedType)) {
            throw new IllegalStateException("원소 타입을 알 수 없는 리스트 컴포넌트다: " + component.getName());
        }
        Class<?> elementType = (Class<?>) parameterizedType.getActualTypeArguments()[0];
        if (!elementType.isRecord()) {
            throw new IllegalStateException("이 테스트가 값을 만들 줄 모르는 리스트 원소 타입이다: " + elementType.getName());
        }
        return elementType;
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
        if (componentType == String.class) {
            return "value-" + next;
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
            } else if (value instanceof List<?> elements) {
                // 인덱스를 경로에 넣어야 원소 순서가 뒤집히는 실수가 값 불일치로 드러난다.
                for (int index = 0; index < elements.size(); index++) {
                    leaves.putAll(flattenLeaves(elements.get(index), path + "[" + index + "]"));
                }
            } else {
                leaves.put(path, value);
            }
        }
        return leaves;
    }
}
