package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.time.Instant;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class DatasetTest {
    /**
     * One dataset per legacy fact table the commercial service already reads. A quarter that cannot be
     * backfilled for one of these tables leaves that screen stuck on 20233, so the list is asserted whole.
     * The names are also the {@code dataset_active_release.dataset} contract commercial-service resolves through
     * the shared {@link DatasetKey}, so the two enums must agree name for name.
     */
    @Test
    void coversEveryLegacyFactTableAndMatchesTheSharedDatasetKeyContract() {
        assertThat(Arrays.stream(Dataset.values()).map(Dataset::name))
            .containsExactlyInAnyOrderElementsOf(Arrays.stream(DatasetKey.values()).map(DatasetKey::name).toList());
    }

    /**
     * The reader's fail-closed mappers require these columns; a row published without them would turn every
     * lookup for that quarter into a 500. Row validation must therefore reject such rows before publishing.
     */
    @Test
    void rowValidationRequiresEveryColumnTheReaderNeeds() {
        for (Dataset dataset : Dataset.values()) {
            Set<String> readerFields = DatasetKey.valueOf(dataset.name()).readerRequiredFields();
            assertThat(dataset.requiredMetrics()).as("%s", dataset).containsAll(readerFields);
        }
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

    /**
     * Every service name below answered a live sample-key call on 2026-09-08, so the API path is open for
     * all fifteen datasets. Pinning the names keeps a typo from silently pointing a dataset at a
     * different Seoul view (the envelope key would then never match and the run fails late).
     */
    @Test
    void everyDatasetHasALiveVerifiedApiServiceSoApiRunsAreAcceptedForAll() {
        Map<Dataset, String> verified = new EnumMap<>(Dataset.class);
        verified.put(Dataset.SALES_COMMERCIAL, "VwsmTrdarSelngQq");
        verified.put(Dataset.STORE_COMMERCIAL, "VwsmTrdarStorQq");
        verified.put(Dataset.FOOT_TRAFFIC_COMMERCIAL, "VwsmTrdarFlpopQq");
        verified.put(Dataset.CHANGE_COMMERCIAL, "VwsmTrdarIxQq");
        verified.put(Dataset.POPULATION_COMMERCIAL, "VwsmTrdarRepopQq");
        verified.put(Dataset.FACILITY_COMMERCIAL, "VwsmTrdarFcltyQq");
        verified.put(Dataset.CONSUMPTION_COMMERCIAL, "VwsmTrdhlNcmCnsmpQq");
        verified.put(Dataset.SALES_ADMINISTRATION, "VwsmAdstrdSelngW");
        verified.put(Dataset.STORE_ADMINISTRATION, "VwsmAdstrdStorW");
        verified.put(Dataset.CONSUMPTION_ADMINISTRATION, "VwsmAdstrdNcmCnsmpW");
        verified.put(Dataset.SALES_DISTRICT, "VwsmSignguSelngW");
        verified.put(Dataset.STORE_DISTRICT, "VwsmSignguStorW");
        verified.put(Dataset.FOOT_TRAFFIC_DISTRICT, "VwsmSignguFlpopW");
        verified.put(Dataset.CONSUMPTION_DISTRICT, "VwsmSignguNcmCnsmpW");
        verified.put(Dataset.CHANGE_DISTRICT, "VwsmSignguIxQq");
        for (Dataset dataset : Dataset.values()) {
            assertThat(dataset.service()).as("%s", dataset).isEqualTo(verified.get(dataset));
            assertThat(request(dataset, ImportRequest.SourceType.API, null).dataset()).isEqualTo(dataset);
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
