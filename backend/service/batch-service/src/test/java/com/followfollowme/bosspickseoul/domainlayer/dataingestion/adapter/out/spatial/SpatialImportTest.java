package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.SpatialImportProcessor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;

class SpatialImportTest {
    @TempDir Path directory;

    @Test
    void historicalAndStandardSnapshotsKeepSameCodesWithIndependentGeometry() throws Exception {
        SpatialReleasePort releases = mock(SpatialReleasePort.class);
        when(releases.publish(any())).thenReturn(true);
        SpatialImportProcessor processor = processor(releases);
        var historical = processor.importSnapshot(input("legacy-2023", "district-old"), "legacy-2023", false);
        var standard = processor.importSnapshot(input("standard-2024", "district-new"), "standard-2024", false);
        assertThat(historical.published()).isTrue();
        assertThat(standard.published()).isTrue();
        assertThat(historical.checksum()).isNotEqualTo(standard.checksum());
        verify(releases).publish(argThat(snapshot -> snapshot.spatialVersion().equals("legacy-2023")
            && snapshot.areas().getFirst().areaName().equals("district-old")));
        verify(releases).publish(argThat(snapshot -> snapshot.spatialVersion().equals("standard-2024")
            && snapshot.areas().getFirst().areaName().equals("district-new")));
    }

    @Test
    void dryRunArchivesExactBytesButNeverWritesDatabase() throws Exception {
        SpatialReleasePort releases = mock(SpatialReleasePort.class);
        Path input = input("legacy-2023", "district");
        var result = processor(releases).importSnapshot(input, "legacy-2023", true);
        assertThat(result.areaCount()).isEqualTo(3);
        assertThat(result.published()).isFalse();
        assertThat(Files.readAllBytes(directory.resolve("raw/spatial/" + result.checksum() + ".geojson")))
            .isEqualTo(Files.readAllBytes(input));
        processor(releases).importSnapshot(input, "legacy-2023", true);
        verifyNoInteractions(releases);
    }

    @Test
    void rejectsParentCountAndDuplicateCodesBeforePublishing() throws Exception {
        invalid("\"parentCode\":\"11110\"", "\"parentCode\":\"99999\"", "parent");
        invalid("\"DISTRICT\":1", "\"DISTRICT\":2", "count");
        invalid("\"areaType\":\"ADMINISTRATION\"", "\"areaType\":\"DISTRICT\"", "count");
        invalid("\"areaCode\":\"11110530\"", "\"areaCode\":\"not-code\"", "code");
    }

    @Test
    void rejectsVersionMismatchAndBlankNames() throws Exception {
        SpatialReleasePort releases = mock(SpatialReleasePort.class);
        Path input = input("legacy-2023", "district");
        assertThatThrownBy(() -> processor(releases).importSnapshot(input, "standard-2024", false))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("differs");
        invalid("\"areaName\":\"district\"", "\"areaName\":\" \"", "field");
        verifyNoInteractions(releases);
    }

    @Test
    void rejectsUnclosedRingsEmptyGeometryAndProjectedCoordinates() throws Exception {
        invalid("[126,37]]]", "[126,38]]]", "closed");
        invalid("[[[126,37],[127,37],[127,38],[126,37]]]", "[]", "Empty");
        invalid("[126,37]", "[200000,450000]", "range");
    }

    @Test
    void jdbcKeepsReadyVersionImmutableAndRollsBackConflict() throws Exception {
        SpatialSnapshot snapshot = new SpatialGeoJsonSourceAdapter(new ObjectMapper(), directory.resolve("raw"))
            .read(input("legacy-2023", "district"));
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        TransactionStatus transaction = mock(TransactionStatus.class);
        when(manager.getTransaction(any())).thenReturn(transaction);
        when(jdbc.queryForMap(anyString(), any(Object[].class)))
            .thenReturn(Map.of("checksum", snapshot.checksum(), "status", "READY"));
        SpatialReleaseJdbcAdapter adapter = new SpatialReleaseJdbcAdapter(jdbc, manager);
        assertThat(adapter.publish(snapshot)).isFalse();
        verify(manager).commit(transaction);
        verify(jdbc, never()).update(contains("status='READY'"), any(Object[].class));
        when(jdbc.queryForMap(anyString(), any(Object[].class)))
            .thenReturn(Map.of("checksum", "b".repeat(64), "status", "READY"));
        assertThatThrownBy(() -> adapter.publish(snapshot)).hasMessageContaining("immutable");
        verify(manager).rollback(transaction);
    }

    @Test
    void corruptArchiveIsNeverOverwritten() throws Exception {
        Path input = input("legacy-2023", "district");
        var source = new SpatialGeoJsonSourceAdapter(new ObjectMapper(), directory.resolve("raw"));
        SpatialSnapshot snapshot = source.read(input);
        Path archive = directory.resolve("raw/spatial/" + snapshot.checksum() + ".geojson");
        Files.writeString(archive, "corrupt");
        assertThatThrownBy(() -> source.read(input)).hasMessageContaining("corrupt");
        assertThat(Files.readString(archive)).isEqualTo("corrupt");
    }

    private void invalid(String original, String replacement, String message) throws Exception {
        Path input = input("legacy-2023", "district");
        Files.writeString(input, Files.readString(input).replace(original, replacement));
        SpatialReleasePort releases = mock(SpatialReleasePort.class);
        assertThatThrownBy(() -> processor(releases).importSnapshot(input, "legacy-2023", false))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining(message);
        verifyNoInteractions(releases);
    }

    private SpatialImportProcessor processor(SpatialReleasePort releases) {
        return new SpatialImportProcessor(new SpatialGeoJsonSourceAdapter(new ObjectMapper(), directory.resolve("raw")), releases);
    }

    private Path input(String version, String districtName) throws Exception {
        return Files.writeString(directory.resolve(version + ".geojson"), """
            {"type":"FeatureCollection","spatialVersion":"%s","sourceUpdatedAt":"2026-07-03T00:00:00Z",
             "expectedCounts":{"DISTRICT":1,"ADMINISTRATION":1,"COMMERCIAL":1},"features":[
              {"type":"Feature","properties":{"areaType":"DISTRICT","areaCode":"11110","areaName":"%s","parentCode":null},
               "geometry":{"type":"Polygon","coordinates":[[[126,37],[127,37],[127,38],[126,37]]]}},
              {"type":"Feature","properties":{"areaType":"ADMINISTRATION","areaCode":"11110530","areaName":"administration","parentCode":"11110"},
               "geometry":{"type":"Polygon","coordinates":[[[126,37],[127,37],[127,38],[126,37]]]}},
              {"type":"Feature","properties":{"areaType":"COMMERCIAL","areaCode":"3110001","areaName":"commercial","parentCode":"11110530"},
               "geometry":{"type":"MultiPolygon","coordinates":[[[[126,37],[127,37],[127,38],[126,37]]]]}}
             ]}
            """.formatted(version, districtName));
    }
}
