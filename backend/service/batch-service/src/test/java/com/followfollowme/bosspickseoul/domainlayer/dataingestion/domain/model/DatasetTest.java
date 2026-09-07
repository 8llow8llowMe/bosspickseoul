package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class DatasetTest {
    /**
     * One dataset per legacy fact table the commercial service already reads. A quarter that cannot be
     * backfilled for one of these tables leaves that screen stuck on 20233, so the list is asserted whole.
     */
    private static final List<String> LEGACY_FACT_TABLES = List.of(
        "SALES_COMMERCIAL", "STORE_COMMERCIAL", "FOOT_TRAFFIC_COMMERCIAL", "CHANGE_COMMERCIAL",
        "POPULATION_COMMERCIAL", "FACILITY_COMMERCIAL", "CONSUMPTION_COMMERCIAL",
        "SALES_ADMINISTRATION", "STORE_ADMINISTRATION", "CONSUMPTION_ADMINISTRATION",
        "SALES_DISTRICT", "STORE_DISTRICT", "FOOT_TRAFFIC_DISTRICT", "CONSUMPTION_DISTRICT", "CHANGE_DISTRICT");

    @Test
    void coversEveryLegacyFactTableAndNothingElse() {
        assertThat(Arrays.stream(Dataset.values()).map(Dataset::name))
            .containsExactlyInAnyOrderElementsOf(LEGACY_FACT_TABLES);
    }

    @Test
    void theAreaCodeFieldFollowsTheScopeInsteadOfBeingRepeatedPerDataset() {
        for (Dataset dataset : Dataset.values()) {
            assertThat(dataset.areaField()).as("%s", dataset).isEqualTo(dataset.scope().areaField());
            assertThat(dataset.areaType()).as("%s", dataset).isEqualTo(dataset.scope().name());
        }
        assertThat(AreaScope.COMMERCIAL.parent()).isEqualTo(AreaScope.ADMINISTRATION);
        assertThat(AreaScope.ADMINISTRATION.parent()).isEqualTo(AreaScope.DISTRICT);
        assertThat(AreaScope.DISTRICT.parent()).isNull();
    }

    @Test
    void changeIndicatorIsDerivedFromTheRequiredFieldRatherThanHardcodedPerDataset() {
        for (Dataset dataset : Dataset.values()) {
            assertThat(dataset.changeIndicator()).as("%s", dataset)
                .isEqualTo(dataset.requiredMetrics().contains(Dataset.CHANGE_INDICATOR_FIELD));
            assertThat(dataset.requiredMetrics()).as("%s declares at least one required metric", dataset).isNotEmpty();
        }
        assertThat(Arrays.stream(Dataset.values()).filter(Dataset::changeIndicator).map(Dataset::name))
            .containsExactlyInAnyOrder("CHANGE_COMMERCIAL", "CHANGE_DISTRICT");
    }

    @Test
    void datasetsWithoutARegisteredApiContractRefuseApiRunsInsteadOfGuessingAnEndpoint() {
        List<Dataset> archivalOnly = Arrays.stream(Dataset.values()).filter(d -> d.service().isBlank()).toList();
        assertThat(archivalOnly).isNotEmpty();
        for (Dataset dataset : archivalOnly) {
            assertThatThrownBy(() -> request(dataset, ImportRequest.SourceType.API, null))
                .hasMessageContaining("archival files only");
            assertThat(request(dataset, ImportRequest.SourceType.CSV, java.nio.file.Path.of("source.csv")).dataset())
                .isEqualTo(dataset);
        }
    }

    @Test
    void parseIsCaseInsensitiveSoCliArgumentsStayForgiving() {
        assertThat(Dataset.parse("change_district")).isEqualTo(Dataset.CHANGE_DISTRICT);
        assertThat(Dataset.parse("CHANGE_DISTRICT")).isEqualTo(Dataset.CHANGE_DISTRICT);
    }

    private ImportRequest request(Dataset dataset, ImportRequest.SourceType source, java.nio.file.Path file) {
        return new ImportRequest("test-run", dataset, new Quarter("20241"), "standard-2024", "seoul-v1",
            source, file, "UTF-8", true, 1, Instant.parse("2026-09-06T00:00:00Z"));
    }
}
