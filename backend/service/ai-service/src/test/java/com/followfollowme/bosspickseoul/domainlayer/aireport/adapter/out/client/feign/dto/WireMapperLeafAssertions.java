package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Constructor;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

/**
 * wire DTO → QueryResult 변환이 말단 필드를 하나도 빠뜨리지 않는지 검사하는 공용 테스트 도구.
 *
 * <p><b>왜 필요한가.</b> 골든 테스트는 "peer JSON → wire DTO" 까지만 덮는다. 그 뒤의 "wire DTO → QueryResult" 는
 * 순수 필드 복사라 한 줄만 빠뜨려도 컴파일은 통과하고, 대상 필드가 primitive 면 값이 조용히 0 이 되어
 * LLM 프롬프트에 잘못된 근거가 들어간다. 변환 누락이 wire 분리 리팩토링의 가장 큰 위험이다.
 *
 * <p><b>어떻게 검사하나.</b> wire DTO 트리의 모든 말단 필드에 <b>서로 다른</b> 값을 채워 넣고 변환한 뒤,
 * 양쪽 트리를 {@code 경로 -> 값} 맵으로 펼쳐 비교한다. 값이 전부 다르므로 누락(0 또는 null 로 남음)뿐 아니라
 * 필드가 서로 뒤바뀐 경우도 잡힌다. 말단 필드 개수도 함께 못 박아, wire DTO 에 필드를 추가하고 변환을 빠뜨리면
 * 개수 단언에서 먼저 걸린다.
 *
 * <p>peer 별 매퍼가 둘 이상이라(commercial / regional) 검사 방식을 한 곳에 둔다. 매퍼마다 같은 리플렉션 코드를
 * 복사하면 한쪽만 고쳐져 검사 강도가 갈라진다.
 */
public final class WireMapperLeafAssertions {

    /** 리스트 컴포넌트에 채울 원소 개수. 1개면 리스트가 통째로 날아가도 첫 원소만 옮겨져도 구별되지 않는다. */
    private static final int LIST_ELEMENT_COUNT = 2;

    private WireMapperLeafAssertions() {
    }

    public static void assertEveryLeafCopied(
        Class<?> wireType, Class<?> queryType, Function<Object, Object> mapping, int expectedLeafCount
    ) throws Exception {
        assertEveryLeafCopied(wireType, queryType, mapping, expectedLeafCount, Map.of());
    }

    /**
     * @param expectedLeafCount wire DTO 트리의 말단 필드 개수
     * @param derivedQueryPathToWirePath wire 에 같은 경로의 짝이 없는 QueryResult 필드 → 그 값을 파생시킨 wire 경로.
     *                                   여기 적힌 필드는 원천과 값이 같은지 따로 단언한 뒤 1:1 비교에서 제외한다.
     */
    public static void assertEveryLeafCopied(
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

        // 파생 필드를 뺀 나머지는 경로 이름과 값이 모두 같아야 한다. 빠뜨린 필드는 값 불일치(0 / 0.0 / null)로,
        // 구조 변경이나 신고되지 않은 파생 필드는 키 불일치로 드러난다.
        assertThat(queryLeaves).isEqualTo(wireLeaves);
    }

    public static Object instantiateWithDistinctValues(Class<?> recordType, AtomicLong sequence) throws Exception {
        RecordComponent[] components = recordType.getRecordComponents();
        Class<?>[] parameterTypes = new Class<?>[components.length];
        Object[] arguments = new Object[components.length];

        for (int index = 0; index < components.length; index++) {
            RecordComponent component = components[index];
            parameterTypes[index] = component.getType();
            arguments[index] = instantiateComponent(component.getType(), component.getGenericType(), sequence);
        }

        Constructor<?> canonicalConstructor = recordType.getDeclaredConstructor(parameterTypes);
        canonicalConstructor.setAccessible(true);
        return canonicalConstructor.newInstance(arguments);
    }

    private static Object instantiateComponent(Class<?> componentType, Type genericType, AtomicLong sequence) throws Exception {
        if (componentType.isRecord()) {
            return instantiateWithDistinctValues(componentType, sequence);
        }
        if (List.class.isAssignableFrom(componentType)) {
            Class<?> elementType = listElementType(genericType);
            List<Object> elements = new ArrayList<>(LIST_ELEMENT_COUNT);
            for (int index = 0; index < LIST_ELEMENT_COUNT; index++) {
                elements.add(instantiateComponent(elementType, elementType, sequence));
            }
            return List.copyOf(elements);
        }
        return distinctValue(componentType, sequence);
    }

    private static Class<?> listElementType(Type genericType) {
        if (genericType instanceof ParameterizedType parameterizedType
            && parameterizedType.getActualTypeArguments()[0] instanceof Class<?> elementType) {
            return elementType;
        }
        throw new IllegalStateException("이 테스트가 원소 타입을 알아낼 수 없는 리스트 컴포넌트다: " + genericType);
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
                // 인덱스를 경로에 넣어 원소 순서가 뒤바뀌면 값 불일치로 드러나게 한다.
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
