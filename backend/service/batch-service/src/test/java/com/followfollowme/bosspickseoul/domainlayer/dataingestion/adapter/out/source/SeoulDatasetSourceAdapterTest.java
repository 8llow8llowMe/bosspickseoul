package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.ImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Quarter;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.*;
import static org.assertj.core.api.Assertions.*;

class SeoulDatasetSourceAdapterTest {
    @TempDir Path directory;

    private DatasetSourceProperties properties() {
        DatasetSourceProperties p = new DatasetSourceProperties();
        p.setRawDirectory(directory.resolve("raw")); p.setApiKey("secretKey"); p.setMaxAttempts(1);
        return p;
    }

    private ImportRequest request(ImportRequest.SourceType type, Path file) {
        return new ImportRequest("run1", Dataset.SALES_COMMERCIAL, new Quarter("20241"), "standard2024", "seoul-v1",
                type, file, "UTF-8", true, 2, Instant.parse("2026-09-06T00:00:00Z"));
    }

    @Test void csvStreamsQuotedRecordsFiltersAnnualRowsAndHashesOriginalBytes() throws Exception {
        byte[] bytes = ("\uFEFF기준_년분기_코드,name\r\n20233,old\r\n20241,\"a,b\r\nc\"\r\n20241,\"d\"\"e\"\r\n").getBytes(StandardCharsets.UTF_8);
        Path file = Files.write(directory.resolve("annual.csv"), bytes);
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties());
        String firstArchive;
        try (var source = adapter.open(request(ImportRequest.SourceType.CSV, file))) {
            assertThatThrownBy(source::receipt).isInstanceOf(IllegalStateException.class);
            assertThat(source.read().fields().get("name")).isEqualTo("a,b\r\nc");
            assertThat(source.read().fields().get("name")).isEqualTo("d\"e");
            assertThat(source.read()).isNull();
            assertThat(source.receipt().inputRows()).isEqualTo(2);
            assertThat(source.receipt().checksum()).isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));
            assertThat(source.receipt()).isEqualTo(source.receipt());
            firstArchive = source.receipt().rawLocation();
        }
        try (var second = adapter.open(request(ImportRequest.SourceType.CSV, file))) {
            while (second.read() != null) { }
            assertThat(second.receipt().rawLocation()).isNotEqualTo(firstArchive);
            assertThat(Files.readAllBytes(Path.of(firstArchive).resolve("source.csv"))).isEqualTo(bytes);
        }
    }

    @Test void zipReadsEveryCsvEntryWithoutExtractingEntryPaths() throws Exception {
        Path file = directory.resolve("annual.zip");
        try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(file))) {
            for (String name : List.of("../first.csv", "nested/second.csv")) {
                zip.putNextEntry(new ZipEntry(name));
                zip.write("STDR_YYQU_CD,name\n20241,yes\n20242,no\n".getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        }
        try (var source = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties()).open(request(ImportRequest.SourceType.ZIP, file))) {
            assertThat(source.read()).isNotNull(); assertThat(source.read()).isNotNull(); assertThat(source.read()).isNull();
            assertThat(source.receipt().inputRows()).isEqualTo(2);
            assertThat(directory.resolve("first.csv")).doesNotExist();
        }
    }

    @Test void malformedCsvAndDuplicateHeadersFailClosed() throws Exception {
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties());
        Path duplicate = Files.writeString(directory.resolve("duplicate.csv"), "STDR_YYQU_CD,STDR_YYQU_CD\n20241,20241");
        assertThatThrownBy(() -> adapter.open(request(ImportRequest.SourceType.CSV, duplicate))).hasMessageContaining("duplicated");
        Path bad = Files.writeString(directory.resolve("bad.csv"), "STDR_YYQU_CD,name\n20241,\"unclosed");
        try (var source = adapter.open(request(ImportRequest.SourceType.CSV, bad))) {
            assertThatThrownBy(source::read).hasMessageContaining("Unclosed");
            assertThatThrownBy(source::receipt).isInstanceOf(IllegalStateException.class);
        }
        Path width = Files.writeString(directory.resolve("width.csv"), "STDR_YYQU_CD,name\n20241,a,extra");
        try (var source = adapter.open(request(ImportRequest.SourceType.CSV, width))) {
            assertThatThrownBy(source::read).hasMessageContaining("field count");
        }
    }

    private byte[] page(long total, int count) throws Exception {
        var rows = new ArrayList<Map<String, String>>();
        for (int i = 0; i < count; i++) rows.add(Map.of("STDR_YYQU_CD", "20241", "TRDAR_CD", "1"));
        return new ObjectMapper().writeValueAsBytes(Map.of(Dataset.SALES_COMMERCIAL.service(),
                Map.of("RESULT", Map.of("CODE", "INFO-000"), "list_total_count", total, "row", rows)));
    }

    @Test void apiPaginatesAndChecksumsAllPages() throws Exception {
        byte[] first = page(1001, 1000), last = page(1001, 1);
        AtomicInteger calls = new AtomicInteger();
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> {
            int call = calls.incrementAndGet();
            assertThat(uri.getPath()).endsWith(call == 1 ? "/1/1000/20241" : "/1001/1001/20241");
            return new SeoulDatasetSourceAdapter.ApiResponse(200, call == 1 ? first : last);
        });
        try (var source = adapter.open(request(ImportRequest.SourceType.API, null))) {
            for (int i = 0; i < 1001; i++) assertThat(source.read()).isNotNull();
            assertThat(source.read()).isNull(); assertThat(calls).hasValue(2);
            MessageDigest digest = MessageDigest.getInstance("SHA-256"); digest.update(first); digest.update(last);
            assertThat(source.receipt().checksum()).isEqualTo(HexFormat.of().formatHex(digest.digest()));
            assertThat(source.receipt().inputRows()).isEqualTo(1001);
        }
    }

    @Test void incompleteAndChangingPagesCannotProduceReceipt() throws Exception {
        byte[] incomplete = page(2, 1);
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> new SeoulDatasetSourceAdapter.ApiResponse(200, incomplete));
        try (var source = adapter.open(request(ImportRequest.SourceType.API, null))) {
            assertThatThrownBy(source::read).hasMessageContaining("Incomplete");
            assertThatThrownBy(source::receipt).isInstanceOf(IllegalStateException.class);
        }
        byte[] first = page(1001, 1000), changed = page(1002, 2);
        AtomicInteger calls = new AtomicInteger();
        var changing = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> new SeoulDatasetSourceAdapter.ApiResponse(200, calls.incrementAndGet() == 1 ? first : changed));
        try (var source = changing.open(request(ImportRequest.SourceType.API, null))) {
            for (int i = 0; i < 1000; i++) source.read();
            assertThatThrownBy(source::read).hasMessageContaining("changed");
        }
    }

    @Test void transportAndErrorPayloadNeverLeakApiKey() {
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> { throw new IOException(uri.toString()); });
        try (var source = adapter.open(request(ImportRequest.SourceType.API, null))) {
            assertThatThrownBy(source::read).hasMessageNotContaining("secretKey").hasNoCause();
        }
        var rejected = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> new SeoulDatasetSourceAdapter.ApiResponse(200,
                "{\"RESULT\":{\"CODE\":\"ERROR-300\",\"MESSAGE\":\"secretKey\"}}".getBytes(StandardCharsets.UTF_8)));
        try (var source = rejected.open(request(ImportRequest.SourceType.API, null))) {
            assertThatThrownBy(source::read).hasMessageNotContaining("secretKey").hasNoCause();
        }
    }

    @Test void rejectsUntrustedHostBeforeTransport() {
        var p = properties(); p.setBaseUrl("http://attacker.invalid:8088");
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), p, uri -> { throw new AssertionError("Must not send API key"); });
        assertThatThrownBy(() -> adapter.open(request(ImportRequest.SourceType.API, null))).hasMessageContaining("Invalid Seoul API endpoint");
    }

    @Test void ms949AndExplicitKoreanAliasesPreserveValues() throws Exception {
        Path file = Files.write(directory.resolve("korean.csv"), "기준 년분기 코드,상권_코드,상권_명\n20241,100,서울\n"
                .getBytes(java.nio.charset.Charset.forName("MS949")));
        var p = properties(); p.getHeaderAliases().put("상권_코드", "TRDAR_CD");
        var req = new ImportRequest("run1", Dataset.SALES_COMMERCIAL, new Quarter("20241"), "standard2024", "seoul-v1",
                ImportRequest.SourceType.CSV, file, "MS949", true, 1, Instant.now());
        try (var source = new SeoulDatasetSourceAdapter(new ObjectMapper(), p).open(req)) {
            assertThat(source.read().fields()).containsEntry("TRDAR_CD", "100").containsEntry("상권_명", "서울");
            assertThat(source.read()).isNull();
        }
    }

    @Test void invalidQuarterAndDuplicateJsonFieldsAreRejected() throws Exception {
        Path file = Files.writeString(directory.resolve("quarter.csv"), "STDR_YYQU_CD,name\nwrong,ignored\n20241,valid\n");
        try (var source = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties()).open(request(ImportRequest.SourceType.CSV, file))) {
            assertThatThrownBy(source::read).hasMessageContaining("Invalid CSV quarter");
        }
        byte[] duplicate = ("{\"" + Dataset.SALES_COMMERCIAL.service() + "\":{\"RESULT\":{\"CODE\":\"INFO-000\"},"
                + "\"list_total_count\":1,\"row\":[{\"STDR_YYQU_CD\":\"20241\",\"STDR_YYQU_CD\":\"20241\"}]}}")
                .getBytes(StandardCharsets.UTF_8);
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), properties(), uri -> new SeoulDatasetSourceAdapter.ApiResponse(200, duplicate));
        try (var source = adapter.open(request(ImportRequest.SourceType.API, null))) {
            assertThatThrownBy(source::read).hasMessageContaining("decode").hasNoCause();
        }
    }

    @Test void transientHttpResponseRetriesWithinBound() throws Exception {
        var p = properties(); p.setMaxAttempts(2);
        AtomicInteger calls = new AtomicInteger();
        byte[] body = page(1, 1);
        var adapter = new SeoulDatasetSourceAdapter(new ObjectMapper(), p, uri ->
                new SeoulDatasetSourceAdapter.ApiResponse(calls.incrementAndGet() == 1 ? 503 : 200, body));
        try (var source = adapter.open(request(ImportRequest.SourceType.API, null))) {
            assertThat(source.read()).isNotNull(); assertThat(source.read()).isNull();
            assertThat(calls).hasValue(2);
        }
    }
}
