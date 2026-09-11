package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.RowValidation;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DatasetRowProcessorTest {
    private final DatasetRowProcessor processor = new DatasetRowProcessor();

    @Test
    void acceptsIndustryRowAndPreservesColumnsAddedBySourceRevisions() {
        Map<String, String> fields = complete(Dataset.SALES_COMMERCIAL, Map.of(
            "TRDAR_CD", "3110008", "SVC_INDUTY_CD", "CS100001",
            "THSMON_SELNG_AMT", "1234567", "MDWK_SELNG_RT", "0.42", "NEW_QUARTER_AMT", "10"));
        RowValidation result = processor.process(request(Dataset.SALES_COMMERCIAL), new SourceRow(7, fields));
        assertThat(result.accepted()).isTrue();
        assertThat(result.fact().areaCode()).isEqualTo("3110008");
        assertThat(result.fact().serviceCode()).isEqualTo("CS100001");
        assertThat(result.fact().rowNumber()).isEqualTo(7);
        assertThat(result.fact().fields()).containsEntry("NEW_QUARTER_AMT", "10");
    }

    @Test
    void nonIndustryDatasetsStageAnEmptyServiceCode() {
        Map<String, String> fields = complete(Dataset.FOOT_TRAFFIC_COMMERCIAL, Map.of("TRDAR_CD", "3110008", "TOT_FLPOP_CO", "5000"));
        RowValidation result = processor.process(request(Dataset.FOOT_TRAFFIC_COMMERCIAL), new SourceRow(1, fields));
        assertThat(result.accepted()).isTrue();
        assertThat(result.fact().serviceCode()).isEmpty();
    }

    @Test
    void readsTheAreaCodeFieldThatMatchesTheDatasetScope() {
        Map<String, String> district = complete(Dataset.FOOT_TRAFFIC_DISTRICT, Map.of("SIGNGU_CD", "11680", "TOT_FLPOP_CO", "1"));
        assertThat(processor.process(request(Dataset.FOOT_TRAFFIC_DISTRICT), new SourceRow(1, district)).fact().areaCode())
            .isEqualTo("11680");
        Map<String, String> administration = complete(Dataset.STORE_ADMINISTRATION, Map.of(
            "ADSTRD_CD", "11680101", "STOR_CO", "3", "SVC_INDUTY_CD", "CS100001"));
        assertThat(processor.process(request(Dataset.STORE_ADMINISTRATION), new SourceRow(1, administration)).fact().areaCode())
            .isEqualTo("11680101");
        // A district row fed to a commercial dataset has no TRDAR_CD and must not be staged under the wrong key.
        assertThat(processor.process(request(Dataset.FOOT_TRAFFIC_COMMERCIAL), new SourceRow(1, district)).rejectionReason())
            .isEqualTo("AREA_CODE_INVALID");
    }

    @Test
    void rejectsRowsFromOtherQuartersSoFullTimelineSourcesCannotLeak() {
        Map<String, String> fields = new LinkedHashMap<>(row(Map.of("TRDAR_CD", "3110008", "TOT_FLPOP_CO", "1")));
        fields.put("STDR_YYQU_CD", "20233");
        RowValidation result = processor.process(request(Dataset.FOOT_TRAFFIC_COMMERCIAL), new SourceRow(1, fields));
        assertThat(result.accepted()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("PERIOD_MISMATCH");
    }

    @Test
    void rejectsInvalidIndustryCodes() {
        Map<String, String> fields = row(Map.of("TRDAR_CD", "3110008", "SVC_INDUTY_CD", "CS1", "STOR_CO", "3"));
        assertThat(processor.process(request(Dataset.STORE_COMMERCIAL), new SourceRow(1, fields)).rejectionReason())
            .isEqualTo("SERVICE_CODE_INVALID");
    }

    @Test
    void distinguishesAMissingRequiredMetricFromAMeasuredZero() {
        Map<String, String> blank = complete(Dataset.SALES_COMMERCIAL, Map.of(
            "TRDAR_CD", "3110008", "SVC_INDUTY_CD", "CS100001", "THSMON_SELNG_AMT", ""));
        assertThat(processor.process(request(Dataset.SALES_COMMERCIAL), new SourceRow(1, blank)).rejectionReason())
            .isEqualTo("REQUIRED_FIELD_MISSING:THSMON_SELNG_AMT");
        Map<String, String> zero = complete(Dataset.SALES_COMMERCIAL, Map.of(
            "TRDAR_CD", "3110008", "SVC_INDUTY_CD", "CS100001", "THSMON_SELNG_AMT", "0"));
        RowValidation measured = processor.process(request(Dataset.SALES_COMMERCIAL), new SourceRow(1, zero));
        assertThat(measured.accepted()).isTrue();
        assertThat(measured.fact().fields()).containsEntry("THSMON_SELNG_AMT", "0");
    }

    @Test
    void everyChangeIndicatorDatasetAcceptsOnlyItsCodeSet() {
        for (Dataset dataset : Dataset.values()) {
            if (!dataset.changeIndicator()) continue;
            Map<String, String> valid = complete(dataset, Map.of(dataset.areaField(), "11680", Dataset.CHANGE_INDICATOR_FIELD, "HH"));
            assertThat(processor.process(request(dataset), new SourceRow(1, valid)).accepted())
                .as("%s accepts HH", dataset).isTrue();
            Map<String, String> unknown = complete(dataset, Map.of(dataset.areaField(), "11680", Dataset.CHANGE_INDICATOR_FIELD, "XX"));
            assertThat(processor.process(request(dataset), new SourceRow(1, unknown)).rejectionReason())
                .as("%s rejects XX", dataset).isEqualTo("CHANGE_INDICATOR_INVALID");
        }
    }

    @Test
    void rejectsNegativeUnparsableAndOversizedMetrics() {
        assertThat(metricRejection("-1")).isEqualTo("NUMERIC_VALUE_INVALID:TOT_FLPOP_CO");
        assertThat(metricRejection("1,000")).isEqualTo("NUMERIC_VALUE_INVALID:TOT_FLPOP_CO");
        assertThat(metricRejection("1".repeat(31))).isEqualTo("NUMERIC_VALUE_INVALID:TOT_FLPOP_CO");
        assertThat(metricRejection("0.00000000001")).isEqualTo("NUMERIC_VALUE_INVALID:TOT_FLPOP_CO");
    }

    private String metricRejection(String value) {
        Map<String, String> fields = complete(Dataset.FOOT_TRAFFIC_COMMERCIAL, Map.of("TRDAR_CD", "3110008", "TOT_FLPOP_CO", value));
        return processor.process(request(Dataset.FOOT_TRAFFIC_COMMERCIAL), new SourceRow(1, fields)).rejectionReason();
    }

    /** 데이터셋이 요구하는 모든 컬럼을 채운 행. 지표는 "1", 이름·코드 텍스트는 "A" 다. 넘긴 값이 우선한다. */
    private Map<String, String> complete(Dataset dataset, Map<String, String> values) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (String field : dataset.requiredMetrics()) {
            fields.put(field, field.endsWith("_CO") || field.endsWith("_AMT") || field.endsWith("_AVRG") || field.endsWith("_RT")
                || field.endsWith("_TOTAMT") ? "1" : "A");
        }
        fields.putAll(values);
        return row(fields);
    }

    private Map<String, String> row(Map<String, String> values) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        fields.putAll(values);
        return fields;
    }

    private ImportRequest request(Dataset dataset) {
        return new ImportRequest("test-run", dataset, new Quarter("20241"), "standard-2024", "seoul-v1",
            ImportRequest.SourceType.CSV, java.nio.file.Path.of("source.csv"), "UTF-8", true, 1,
            Instant.parse("2026-09-06T00:00:00Z"));
    }
}
