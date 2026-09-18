package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ProjectionRequest;
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

        // 짝을 손으로 적어 넣는 자리이므로 어긋날 수 있다. 어긋나면 Open API 서비스명이 통째로 바뀐다.
        for (Dataset dataset : Dataset.values()) {
            assertThat(dataset.key().name()).as("%s", dataset).isEqualTo(dataset.name());
        }
    }

    /**
     * The reader's fail-closed mappers require these columns; a row published without them would turn every
     * lookup for that quarter into a 500. Row validation must therefore reject such rows before publishing.
     */
    @Test
    void rowValidationRequiresEveryColumnTheReaderNeeds() {
        for (Dataset dataset : Dataset.values()) {
            Set<String> readerFields = dataset.key().readerRequiredFields();
            assertThat(dataset.requiredMetrics()).as("%s", dataset).containsAll(readerFields);
        }
    }

    /**
     * 행정동 소비는 상권 소비가 끊긴 뒤의 대체 원천이라 총액만으로는 항목별 화면을 채울 수 없다(이슈 #415).
     * 세부 10항목은 2026-09-17 Open API 전수 호출에서 425개 행정동 × 22분기 모두 존재했고 누락이 0건이라 필수로 둔다.
     * 상권(9항목)과 구성이 다르다 — 여가·문화가 하나로 합쳐져 있고 기타·음식이 더 있다. 억지로 맞추지 않는다.
     */
    @Test
    void administrationConsumptionRequiresTheTotalAndAllTenDetailItems() {
        assertThat(Dataset.CONSUMPTION_ADMINISTRATION.requiredMetrics()).containsExactlyInAnyOrder(
            "ADSTRD_CD_NM", "EXPNDTR_TOTAMT",
            "FDSTFFS_EXPNDTR_TOTAMT", "CLTHS_FTWR_EXPNDTR_TOTAMT", "LVSPL_EXPNDTR_TOTAMT", "MCP_EXPNDTR_TOTAMT",
            "TRNSPORT_EXPNDTR_TOTAMT", "EDC_EXPNDTR_TOTAMT", "PLESR_EXPNDTR_TOTAMT", "LSR_CLTUR_EXPNDTR_TOTAMT",
            "ETC_EXPNDTR_TOTAMT", "FD_EXPNDTR_TOTAMT");

        assertThat(Dataset.CONSUMPTION_ADMINISTRATION.requiredMetrics())
            .as("행정동 원천에는 여가·문화를 나눈 컬럼이 없다")
            .doesNotContain("LSR_EXPNDTR_TOTAMT", "CLTUR_EXPNDTR_TOTAMT");
        assertThat(Dataset.CONSUMPTION_COMMERCIAL.requiredMetrics())
            .as("상권 원천에는 합산 컬럼과 기타·음식이 없다")
            .doesNotContain("LSR_CLTUR_EXPNDTR_TOTAMT", "ETC_EXPNDTR_TOTAMT", "FD_EXPNDTR_TOTAMT");
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
     *
     * <p>이름의 정본은 공유 모듈의 {@code DatasetKey.openApiService()} 다(이슈 #415). commercial-service 가
     * 소비 지표의 출처({@code sourceId})로 같은 값을 인용하므로, 포털 재게시로 이름이 바뀌면 이 테스트와
     * commercial-service 의 {@code ExpenseSourceDatasetTest} 가 함께 깨져 양쪽을 같이 고치게 만든다.
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

    /**
     * 소비-상권배후지는 {@code 20241} 분기부터 원천이 전 행 0 이다(2026-09-15 전수 실측, 23,980행).
     * 0 만 쌓인 슬롯은 화면이 "0원"을 실제 값으로 그리게 만들므로 게시 요청 단계에서 막는다.
     */
    @Test
    void discontinuedDatasetRejectsQuartersPastItsLastPublishableOne() {
        assertThatThrownBy(() -> new ImportRequest("test-run", Dataset.CONSUMPTION_COMMERCIAL, new Quarter("20241"),
            "standard-2024", "seoul-v1", ImportRequest.SourceType.API, null, "UTF-8", true, 1,
            Instant.parse("2026-09-06T00:00:00Z")))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("20234");

        assertThat(Dataset.SALES_COMMERCIAL.lastPublishableQuarter()).isEmpty();
    }

    /**
     * {@code --job=project} 도 같은 상한을 받아야 한다. 팩트 테이블에 실제로 INSERT 하는 것은 이 Job 이라,
     * 사실 적재만 막으면 이미 스테이징된 {@code 20241}+ 릴리스를 재투영해 0 행이 다시 게시된다.
     */
    @Test
    void discontinuedDatasetRejectsTheSameQuartersOnTheProjectionJob() {
        assertThatThrownBy(() -> new ProjectionRequest("test-run", Dataset.CONSUMPTION_COMMERCIAL, new Quarter("20241"),
            "standard-2024", "seoul-v1", true))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("20234");

        assertThatCode(() -> new ProjectionRequest("test-run", Dataset.SALES_COMMERCIAL, new Quarter("20241"),
            "standard-2024", "seoul-v1", true))
            .doesNotThrowAnyException();
    }

    /** 상한 분기 자체는 두 Job 모두 그대로 받는다 — 경계에서 한 칸 더 막지 않는다. */
    @Test
    void theLastPublishableQuarterItselfIsStillAcceptedByBothJobs() {
        Quarter last = Dataset.CONSUMPTION_COMMERCIAL.lastPublishableQuarter().orElseThrow();

        assertThatCode(() -> request(Dataset.CONSUMPTION_COMMERCIAL, ImportRequest.SourceType.API, null))
            .doesNotThrowAnyException();
        assertThatCode(() -> new ProjectionRequest("test-run", Dataset.CONSUMPTION_COMMERCIAL, last,
            "standard-2024", "seoul-v1", true))
            .doesNotThrowAnyException();
    }

    /** 게시 상한이 있는 데이터셋은 그 분기로, 나머지는 2024년 이후 분기로 요청을 만든다. */
    private ImportRequest request(Dataset dataset, ImportRequest.SourceType source, java.nio.file.Path file) {
        Quarter period = dataset.lastPublishableQuarter().orElseGet(() -> new Quarter("20241"));
        return new ImportRequest("test-run", dataset, period, "standard-2024", "seoul-v1",
            source, file, "UTF-8", true, 1, Instant.parse("2026-09-06T00:00:00Z"));
    }
}
