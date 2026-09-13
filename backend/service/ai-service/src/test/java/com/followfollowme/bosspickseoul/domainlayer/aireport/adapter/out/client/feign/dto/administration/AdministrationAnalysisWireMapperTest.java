package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.administration;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * wire DTO → QueryResult 변환이 말단 필드를 하나도 빠뜨리지 않는지 검사한다.
 *
 * <p><b>왜 필요한가.</b> {@code AdministrationAnalysisWireGoldenJsonTest} 는 "peer JSON → wire DTO" 까지만 덮는다.
 * 그 뒤의 "wire DTO → QueryResult" 는 순수 필드 복사라 한 줄만 빠뜨려도 컴파일은 통과하고, 대상 필드가 primitive 라
 * 값이 조용히 0 이 되어 LLM 프롬프트에 잘못된 근거가 들어간다. 변환 누락이 이 리팩토링의 가장 큰 위험이다.
 *
 * <p><b>어떻게 검사하나.</b> wire DTO 트리의 모든 말단 필드에 <b>서로 다른</b> 값을 채워 넣고 변환한 뒤,
 * 양쪽 트리를 {@code 경로 -> 값} 맵으로 펼쳐 비교한다. 값이 전부 다르므로 누락(0 또는 null 로 남음)뿐 아니라
 * 필드가 서로 뒤바뀐 경우도 잡힌다. 말단 필드 개수도 함께 못 박아, wire DTO 에 필드를 추가하고 변환을 빠뜨리면
 * 개수 단언에서 먼저 걸린다.
 *
 * <p><b>Commercial 쪽과 다른 점은 목록이다.</b> Administration 상세는 상위 업종을 {@code List} 로 받는다.
 * 그래서 값 생성기와 평탄화기가 {@code List<레코드>} 를 다룰 줄 알아야 하고, 항목을 <b>2개씩</b> 만들어
 * {@code [0]} / {@code [1]} 경로로 펼친다. 항목이 하나뿐이면 목록 순서가 뒤집혀도 통과하기 때문이다.
 *
 * <p>파생 필드는 없다. 8종 전부 이름·구조가 1:1 이라 경로 맵을 그대로 비교한다.
 */
class AdministrationAnalysisWireMapperTest {

    @Test
    @DisplayName("행정동 상세 wire DTO 의 말단 필드 29개가 모두 QueryResult 로 옮겨진다")
    void detailMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            AdministrationDetailClientResponse.class,
            AdministrationDetailQueryResult.class,
            wire -> AdministrationAnalysisWireMapper.toQueryResult((AdministrationDetailClientResponse) wire),
            // 코드·이름 2 + 매출 상위 업종 2건 x 4 + 점포 상위 업종 2건 x 9 + 총 지출 1
            29
        );
    }

    @Test
    @DisplayName("행정동 상위 지역 wire DTO 의 말단 필드 4개가 모두 QueryResult 로 옮겨진다")
    void administrationDistrictMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            AdministrationDistrictClientResponse.class,
            AdministrationDistrictQueryResult.class,
            wire -> AdministrationAnalysisWireMapper.toQueryResult((AdministrationDistrictClientResponse) wire),
            4
        );
    }

    @Test
    @DisplayName("행정동 소속 상권 wire DTO 의 말단 필드 2개가 모두 QueryResult 로 옮겨진다")
    void administrationCommercialMapsEveryLeafField() throws Exception {
        assertEveryLeafCopied(
            AdministrationCommercialClientResponse.class,
            AdministrationCommercialQueryResult.class,
            wire -> AdministrationAnalysisWireMapper.toQueryResult((AdministrationCommercialClientResponse) wire),
            2
        );
    }

    @Test
    @DisplayName("상권 목록은 순서를 유지한 채 항목마다 변환된다")
    void commercialListKeepsOrder() {
        List<AdministrationCommercialClientResponse> wires = List.of(
            new AdministrationCommercialClientResponse("3110125", "강남역"),
            new AdministrationCommercialClientResponse("3110008", "역삼역")
        );

        List<AdministrationCommercialQueryResult> queryResults =
            AdministrationAnalysisWireMapper.toCommercialQueryResults(wires);

        assertThat(queryResults).containsExactly(
            AdministrationCommercialQueryResult.builder().commercialCode("3110125").commercialName("강남역").build(),
            AdministrationCommercialQueryResult.builder().commercialCode("3110008").commercialName("역삼역").build()
        );
    }

    @Test
    @DisplayName("peer 가 중첩 블록을 생략하면 null 이 그대로 전달된다(기존 역직렬화 동작과 같다)")
    void nullNestedBlockStaysNull() {
        AdministrationDetailClientResponse wire =
            new AdministrationDetailClientResponse("11680101", "역삼1동", null, null, null);

        AdministrationDetailQueryResult queryResult = AdministrationAnalysisWireMapper.toQueryResult(wire);

        // 매퍼가 빈 객체를 지어내면 "지출 0원" 같은 거짓 근거가 프롬프트에 들어간다. 값이 없다는 사실은
        // AiReportProcessor 의 역참조 지점에서 NPE 로 드러나게 둔다.
        assertThat(queryResult.sales()).isNull();
        assertThat(queryResult.store()).isNull();
        assertThat(queryResult.income()).isNull();
        assertThat(queryResult.administrationCode()).isEqualTo("11680101");
        assertThat(queryResult.administrationName()).isEqualTo("역삼1동");
    }

    @Test
    @DisplayName("peer 가 목록을 생략하면 빈 목록이 아니라 null 이 그대로 전달된다")
    void nullListStaysNull() {
        AdministrationDetailClientResponse wire = new AdministrationDetailClientResponse(
            "11680101", "역삼1동",
            new AdministrationSalesDetailClientResponse(null),
            new AdministrationStoreDetailClientResponse(null),
            new AdministrationIncomeDetailClientResponse(3101L)
        );

        AdministrationDetailQueryResult queryResult = AdministrationAnalysisWireMapper.toQueryResult(wire);

        // "상위 업종이 없다"(빈 목록)와 "목록을 받지 못했다"(null)는 다른 사실이라 매퍼가 섞지 않는다.
        assertThat(queryResult.sales().topSalesServices()).isNull();
        assertThat(queryResult.store().topStoreServices()).isNull();
        assertThat(queryResult.income().totalExpenseAmount()).isEqualTo(3101L);
    }

    @Test
    @DisplayName("wire DTO 자체가 null 이면 null 을 돌려준다")
    void nullWireStaysNull() {
        assertThat(AdministrationAnalysisWireMapper.toQueryResult((AdministrationDetailClientResponse) null)).isNull();
        assertThat(AdministrationAnalysisWireMapper.toQueryResult((AdministrationDistrictClientResponse) null)).isNull();
        assertThat(AdministrationAnalysisWireMapper.toQueryResult((AdministrationCommercialClientResponse) null)).isNull();
        assertThat(AdministrationAnalysisWireMapper.toCommercialQueryResults(null)).isNull();
    }

    /**
     * @param expectedLeafCount wire DTO 트리의 말단 필드 개수. 목록은 항목 2개로 펼친 기준이다.
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

        // 경로 이름과 값이 모두 같아야 한다. 빠뜨린 필드는 값 불일치(0 / 0.0 / null)로,
        // 구조 변경이나 목록 순서 뒤집힘은 키 또는 값 불일치로 드러난다.
        assertThat(queryLeaves).isEqualTo(wireLeaves);
    }

    private static final int LIST_SAMPLE_SIZE = 2;

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
                arguments[index] = instantiateList(component.getGenericType(), sequence);
            } else {
                arguments[index] = distinctValue(componentType, sequence);
            }
        }

        Constructor<?> canonicalConstructor = recordType.getDeclaredConstructor(parameterTypes);
        canonicalConstructor.setAccessible(true);
        return canonicalConstructor.newInstance(arguments);
    }

    /** 항목을 하나만 만들면 목록 순서가 뒤집혀도 통과하므로 반드시 2개 이상 만든다. */
    private static List<Object> instantiateList(Type genericType, AtomicLong sequence) throws Exception {
        Class<?> elementType = (Class<?>) ((ParameterizedType) genericType).getActualTypeArguments()[0];
        List<Object> elements = new ArrayList<>();
        for (int index = 0; index < LIST_SAMPLE_SIZE; index++) {
            elements.add(elementType.isRecord()
                ? instantiateWithDistinctValues(elementType, sequence)
                : distinctValue(elementType, sequence));
        }
        return elements;
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
                for (int index = 0; index < elements.size(); index++) {
                    Object element = elements.get(index);
                    String elementPath = path + "[" + index + "]";
                    if (element != null && element.getClass().isRecord()) {
                        leaves.putAll(flattenLeaves(element, elementPath));
                    } else {
                        leaves.put(elementPath, element);
                    }
                }
            } else {
                leaves.put(path, value);
            }
        }
        return leaves;
    }
}
