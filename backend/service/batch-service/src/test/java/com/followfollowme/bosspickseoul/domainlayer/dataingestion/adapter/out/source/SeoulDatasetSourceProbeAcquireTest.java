package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ApiCallBudget;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceAcquisition;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * 자동 최신화의 탐지({@code probe})와 수집({@code acquire}). 실제 API 대신 가짜 전송으로 응답을 준다.
 *
 * <p>"데이터 없음" 응답({@code INFO-200})의 모양은 이 저장소에서 실호출로 확인하지 못했다. 서울 열린데이터광장 공통 코드로
 * 알려진 두 모양(최상위 RESULT, 서비스 키 아래 RESULT)을 모두 empty 로 받는지만 고정한다. 실호출로 다른 모양이 나오면
 * 여기 fixture 와 {@code SeoulDatasetSourceAdapter.NO_DATA} 를 함께 고친다.
 */
class SeoulDatasetSourceProbeAcquireTest {

    private static final Dataset HONOURED = Dataset.SALES_COMMERCIAL;
    private static final Dataset IGNORED = Dataset.CHANGE_DISTRICT;

    @TempDir
    Path directory;

    private DatasetSourceProperties properties() {
        DatasetSourceProperties properties = new DatasetSourceProperties();
        properties.setRawDirectory(directory.resolve("raw"));
        properties.setApiKey("secretKey");
        properties.setMaxAttempts(1);
        return properties;
    }

    private SeoulDatasetSourceAdapter adapter(List<URI> calls, byte[]... bodies) {
        return new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> {
            calls.add(uri);
            return new SeoulDatasetSourceAdapter.ApiResponse(200, bodies[Math.min(calls.size(), bodies.length) - 1]);
        });
    }

    private static byte[] page(Dataset dataset, long total, List<String> periods) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 0; i < periods.size(); i++) {
            rows.add(Map.of("STDR_YYQU_CD", periods.get(i), "SIGNGU_CD", Integer.toString(i)));
        }
        return new ObjectMapper().writeValueAsBytes(Map.of(dataset.service(),
            Map.of("RESULT", Map.of("CODE", "INFO-000"), "list_total_count", total, "row", rows)));
    }

    private static byte[] json(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void probeCallsTheApiOnceForOneRowAndReturnsTheTotal() throws Exception {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, page(HONOURED, 21910, List.of("20262")));

        ApiCallBudget budget = ApiCallBudget.of(5);

        assertThat(adapter.probe(HONOURED, new Quarter("20262"), budget)).contains(21910L);
        assertThat(calls).hasSize(1);
        assertThat(budget.used()).isEqualTo(1);
        assertThat(calls.getFirst().getPath()).endsWith("/json/" + HONOURED.service() + "/1/1/20262");
    }

    @Test
    void probeMapsTopLevelNoDataToEmpty() {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, json("{\"RESULT\":{\"CODE\":\"INFO-200\",\"MESSAGE\":\"해당하는 데이터가 없습니다.\"}}"));

        assertThat(adapter.probe(HONOURED, new Quarter("20263"), ApiCallBudget.of(5))).isEmpty();
    }

    @Test
    void probeMapsServiceLevelNoDataToEmpty() {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, json("{\"" + HONOURED.service() + "\":{\"RESULT\":{\"CODE\":\"INFO-200\"}}}"));

        assertThat(adapter.probe(HONOURED, new Quarter("20263"), ApiCallBudget.of(5))).isEmpty();
    }

    @Test
    void probeKeepsOtherErrorCodesAsFailuresWithoutLeakingTheKey() {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, json("{\"RESULT\":{\"CODE\":\"ERROR-300\",\"MESSAGE\":\"secretKey\"}}"));

        assertThatThrownBy(() -> adapter.probe(HONOURED, new Quarter("20263"), ApiCallBudget.of(5)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageNotContaining("secretKey")
            .hasNoCause();
    }

    @Test
    void probeRejectsAMissingApiKeyBeforeTransport() {
        DatasetSourceProperties properties = properties();
        properties.setApiKey("");
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties, uri -> {
            throw new AssertionError("Must not call without a key");
        });

        assertThatThrownBy(() -> adapter.probe(HONOURED, new Quarter("20263"), ApiCallBudget.of(5))).hasMessageContaining("missing API key");
    }

    @Test
    void acquireArchivesEveryPageAndCountsRowsPerQuarterWithoutFiltering() throws Exception {
        List<String> first = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            first.add(i < 975 ? "20261" : "20262");
        }
        byte[] firstPage = page(IGNORED, 1025, first);
        byte[] lastPage = page(IGNORED, 1025, Collections.nCopies(25, "20262"));
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, firstPage, lastPage);

        ApiCallBudget budget = ApiCallBudget.of(5);

        SourceAcquisition acquisition = adapter.acquire(IGNORED, new Quarter("20262"), "auto-change-district-20262-202609300500-fetch", budget);

        assertThat(budget.used()).isEqualTo(2);
        assertThat(acquisition.sourceTotal()).isEqualTo(1025);
        assertThat(acquisition.rowsByQuarter()).containsExactly(
            Map.entry(new Quarter("20261"), 975L), Map.entry(new Quarter("20262"), 50L));
        assertThat(calls.get(0).getPath()).endsWith("/1/1000/20262");
        assertThat(calls.get(1).getPath()).endsWith("/1001/1025/20262");
        Path raw = Path.of(acquisition.rawLocation());
        assertThat(raw.getFileName().toString()).startsWith("auto-change-district-20262-202609300500-fetch-");
        assertThat(Files.readAllBytes(raw.resolve("page-1.json"))).isEqualTo(firstPage);
        assertThat(Files.readAllBytes(raw.resolve("page-1001.json"))).isEqualTo(lastPage);
    }

    /** 수집한 디렉터리를 기존 ARCHIVE 재생이 그대로 읽어야 한다. 사실 적재 Job 은 이 경로로 원천을 다시 받지 않는다. */
    @Test
    void acquiredArchiveReplaysThroughTheExistingImportSession() throws Exception {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, page(IGNORED, 3, List.of("20261", "20262", "20262")));
        SourceAcquisition acquisition = adapter.acquire(IGNORED, new Quarter("20262"), "auto-fetch", ApiCallBudget.of(5));

        ImportRequest replay = new ImportRequest("auto-dry", IGNORED, new Quarter("20262"), "legacy-20233", "seoul-v1",
            ImportRequest.SourceType.ARCHIVE, Path.of(acquisition.rawLocation()), "UTF-8", true, 2, Instant.parse("2026-06-30T00:00:00Z"));
        try (var session = adapter.open(replay)) {
            int rows = 0;
            while (session.read() != null) {
                rows++;
            }
            assertThat(rows).isEqualTo(2);
            assertThat(session.receipt().inputRows()).isEqualTo(acquisition.rowsByQuarter().get(new Quarter("20262")));
        }
        assertThat(calls).hasSize(1);
    }

    @Test
    void acquireOfAQuarterWithNoDataReturnsAnEmptyAcquisition() {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, json("{\"RESULT\":{\"CODE\":\"INFO-200\"}}"));

        ApiCallBudget budget = ApiCallBudget.of(5);

        SourceAcquisition acquisition = adapter.acquire(HONOURED, new Quarter("20263"), "auto-fetch", budget);

        assertThat(acquisition.rowsByQuarter()).isEmpty();
        assertThat(budget.used()).isEqualTo(1);
    }

    @Test
    void acquireRejectsAnInvalidRunIdBeforeTransport() {
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> {
            throw new AssertionError("Must not call");
        });

        assertThatThrownBy(() -> adapter.acquire(HONOURED, new Quarter("20263"), "../escape", ApiCallBudget.of(5))).hasMessageContaining("runId");
    }

    /** 재시도도 호출이다. 키당 하루 1,000회 한도라 5xx 재시도를 빼고 세면 예산이 실제보다 적게 잡힌다. */
    @Test
    void everyRetryAttemptSpendsTheBudget() throws Exception {
        DatasetSourceProperties properties = properties();
        properties.setMaxAttempts(3);
        List<URI> calls = new CopyOnWriteArrayList<>();
        byte[] ok = page(HONOURED, 21910, List.of("20262"));
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties, uri -> {
            calls.add(uri);
            return calls.size() < 3 ? new SeoulDatasetSourceAdapter.ApiResponse(503, new byte[0]) : new SeoulDatasetSourceAdapter.ApiResponse(200, ok);
        });
        ApiCallBudget budget = ApiCallBudget.of(10);

        assertThat(adapter.probe(HONOURED, new Quarter("20262"), budget)).contains(21910L);
        assertThat(calls).hasSize(3);
        assertThat(budget.used()).isEqualTo(3);
    }

    /** 탐지 뒤 원천 합계가 늘어 페이지가 늘어도 남은 예산을 넘겨 부르지 않는다. 받다 만 수집은 돌려주지 않는다. */
    @Test
    void acquireStopsAtTheBudgetInsteadOfOverspending() throws Exception {
        List<String> first = Collections.nCopies(1000, "20262");
        byte[] firstPage = page(IGNORED, 1500, first);
        byte[] lastPage = page(IGNORED, 1500, Collections.nCopies(500, "20262"));
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, firstPage, lastPage);
        ApiCallBudget budget = ApiCallBudget.of(1);

        assertThatThrownBy(() -> adapter.acquire(IGNORED, new Quarter("20262"), "auto-fetch", budget))
            .isInstanceOf(ApiCallBudget.Exhausted.class)
            .hasMessageNotContaining("secretKey");
        assertThat(calls).hasSize(1);
        assertThat(budget.used()).isEqualTo(1);
        assertThat(budget.remaining()).isZero();
    }

    @Test
    void probeWithoutBudgetNeverCallsTheApi() {
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> {
            throw new AssertionError("Must not call without budget");
        });

        assertThatThrownBy(() -> adapter.probe(HONOURED, new Quarter("20263"), ApiCallBudget.of(0))).isInstanceOf(ApiCallBudget.Exhausted.class);
    }

    @Test
    void importSessionsStillTreatNoDataAsAnError() {
        List<URI> calls = new CopyOnWriteArrayList<>();
        var adapter = adapter(calls, json("{\"RESULT\":{\"CODE\":\"INFO-200\"}}"));
        ImportRequest request = new ImportRequest("run1", HONOURED, new Quarter("20263"), "legacy-20233", "seoul-v1",
            ImportRequest.SourceType.API, null, "UTF-8", true, 1, Instant.parse("2026-09-30T00:00:00Z"));

        try (var session = adapter.open(request)) {
            assertThatThrownBy(session::read).hasMessageContaining("unexpected envelope");
        }
    }
}
