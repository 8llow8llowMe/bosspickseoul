package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class TypedFactMappersTest {

    @Test
    void mapsFootTrafficCommercialAndLeavesServiceTypeNullWhenNoMappingIsLoaded() {
        Object[] foot = TypedFactMappers.columns(
            Dataset.FOOT_TRAFFIC_COMMERCIAL, new FactRow(1L, "3110008", "", footFields()),
            "20241", "legacy-20233", ServiceTypeResolver.empty());
        assertThat(foot[0]).isEqualTo("20241");
        assertThat(foot[1]).isEqualTo("legacy-20233");
        assertThat(foot[2]).isEqualTo("3110008");
        assertThat(foot[6]).isEqualTo(100L);

        Object[] store = TypedFactMappers.columns(
            Dataset.STORE_COMMERCIAL, new FactRow(1L, "3110008", "CS100001", storeFields()),
            "20241", "legacy-20233", ServiceTypeResolver.empty());
        assertThat(store[6]).isEqualTo("CS100001");
        assertThat(store[8]).isNull();
    }

    @Test
    void consumptionIncomeColumnsStayNullWhenSourceOmitsThem() {
        Object[] row = TypedFactMappers.columns(
            Dataset.CONSUMPTION_COMMERCIAL, new FactRow(1L, "3110008", "", consumptionFields()),
            "20241", "legacy-20233", ServiceTypeResolver.empty());
        assertThat(row[6]).isNull();
        assertThat(row[7]).isNull();
        assertThat(row[8]).isEqualTo(900L);
    }

    @Test
    void missingRequiredFieldFailsClosed() {
        Map<String, String> fields = footFields();
        fields.remove("TOT_FLPOP_CO");
        assertThatThrownBy(() -> TypedFactMappers.columns(
            Dataset.FOOT_TRAFFIC_COMMERCIAL, new FactRow(1L, "3110008", "", fields),
            "20241", "legacy-20233", ServiceTypeResolver.empty()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("TOT_FLPOP_CO");
    }

    @ParameterizedTest(name = "{0} 의 service_type 자리에 해석된 분류가 들어간다")
    @MethodSource("industryDatasets")
    void resolvedServiceTypeLandsInTheServiceTypeColumn(Dataset dataset, int serviceTypeIndex) {
        ServiceTypeResolver serviceTypes = new ServiceTypeResolver(Map.of("CS100001", "RESTAURANT"));

        Object[] row = TypedFactMappers.columns(
            dataset, new FactRow(1L, areaCode(dataset), "CS100001", industryFields(dataset, "CS100001")),
            "20241", "legacy-20233", serviceTypes);

        assertThat(row[serviceTypeIndex - 2]).isEqualTo("CS100001");
        assertThat(row[serviceTypeIndex - 1]).isEqualTo("한식음식점");
        assertThat(row[serviceTypeIndex]).isEqualTo("RESTAURANT");
        assertThat(serviceTypes.unresolvedRows()).isZero();
        assertThat(serviceTypes.unresolvedCodeCount()).isZero();
    }

    @ParameterizedTest(name = "{0} 의 미매핑 업종 코드는 null 로 남고 집계된다")
    @MethodSource("industryDatasets")
    void unmappedServiceCodeStaysNullAndIsCounted(Dataset dataset, int serviceTypeIndex) {
        ServiceTypeResolver serviceTypes = new ServiceTypeResolver(Map.of("CS100001", "RESTAURANT"));

        Object[] row = TypedFactMappers.columns(
            dataset, new FactRow(1L, areaCode(dataset), "CS999999", industryFields(dataset, "CS999999")),
            "20241", "legacy-20233", serviceTypes);

        assertThat(row[serviceTypeIndex - 2]).isEqualTo("CS999999");
        assertThat(row[serviceTypeIndex]).isNull();
        assertThat(serviceTypes.unresolvedRows()).isEqualTo(1);
        assertThat(serviceTypes.unresolvedCodeSample()).containsExactly("CS999999");
    }

    @Test
    void unresolvedCodesAreCountedPerRowAndDeduplicatedForTheSample() {
        ServiceTypeResolver serviceTypes = new ServiceTypeResolver(Map.of("CS100001", "RESTAURANT"));

        for (String serviceCode : new String[] {"CS900001", "CS900002", "CS900001", "CS100001"}) {
            TypedFactMappers.columns(
                Dataset.STORE_COMMERCIAL, new FactRow(1L, "3110008", serviceCode, industryFields(Dataset.STORE_COMMERCIAL, serviceCode)),
                "20241", "legacy-20233", serviceTypes);
        }

        assertThat(serviceTypes.unresolvedRows()).isEqualTo(3);
        assertThat(serviceTypes.unresolvedCodeCount()).isEqualTo(2);
        assertThat(serviceTypes.unresolvedCodeSample()).containsExactly("CS900001", "CS900002");
    }

    /**
     * service_type 컬럼을 가진 6개 매핑과 그 컬럼의 배열 위치.
     * 위치는 {@code ChangeCommercialProjectionJdbcAdapter} 의 INSERT 컬럼 순서
     * ({@code ..., service_code, service_name, service_type, ...}) 와 같아야 한다.
     */
    private static Stream<Arguments> industryDatasets() {
        return Stream.of(
            Arguments.of(Dataset.STORE_COMMERCIAL, 8),
            Arguments.of(Dataset.SALES_COMMERCIAL, 8),
            Arguments.of(Dataset.STORE_DISTRICT, 6),
            Arguments.of(Dataset.SALES_DISTRICT, 6),
            Arguments.of(Dataset.STORE_ADMINISTRATION, 6),
            Arguments.of(Dataset.SALES_ADMINISTRATION, 6));
    }

    private static String areaCode(Dataset dataset) {
        return switch (dataset.scope()) {
            case COMMERCIAL -> "3110008";
            case DISTRICT -> "11110";
            case ADMINISTRATION -> "11110515";
        };
    }

    private static Map<String, String> industryFields(Dataset dataset, String serviceCode) {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String key : dataset.requiredMetrics()) {
            fields.put(key, key.endsWith("_RT") ? "1.5" : "10");
        }
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("SIGNGU_CD_NM", "종로구");
        fields.put("ADSTRD_CD_NM", "사직동");
        fields.put("SVC_INDUTY_CD", serviceCode);
        fields.put("SVC_INDUTY_CD_NM", "한식음식점");
        return fields;
    }

    private static Map<String, String> footFields() {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("TOT_FLPOP_CO", "100");
        fields.put("ML_FLPOP_CO", "40");
        fields.put("FML_FLPOP_CO", "60");
        for (String key : Dataset.FOOT_TRAFFIC_COMMERCIAL.requiredMetrics()) {
            fields.putIfAbsent(key, "1");
        }
        return fields;
    }

    private static Map<String, String> storeFields() {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String key : Dataset.STORE_COMMERCIAL.requiredMetrics()) {
            fields.put(key, key.endsWith("_RT") ? "1.5" : "10");
        }
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("SVC_INDUTY_CD", "CS100001");
        fields.put("SVC_INDUTY_CD_NM", "한식");
        return fields;
    }

    private static Map<String, String> consumptionFields() {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String key : Dataset.CONSUMPTION_COMMERCIAL.requiredMetrics()) {
            fields.put(key, "1");
        }
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("EXPNDTR_TOTAMT", "900");
        return fields;
    }
}
