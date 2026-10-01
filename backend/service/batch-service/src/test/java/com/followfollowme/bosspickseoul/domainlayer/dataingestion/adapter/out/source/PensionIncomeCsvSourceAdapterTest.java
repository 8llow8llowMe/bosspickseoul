package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSource;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSourceRecord;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * 원본은 포털이 주는 CP949 파일이다. 픽스처는 UTF-8 문자열을 지정 문자셋으로 {@link TempDir} 에 써서 만든다 — 저장소에 CP949 바이너리를 두지 않는다.
 */
class PensionIncomeCsvSourceAdapterTest {

    private static final Charset MS949 = Charset.forName("MS949");
    private static final String CSV = "기준년월,시군구,평균소득월액\r\n2024-12,서울특별시종로구,1555244\r\n2024-12,부산광역시중구,1300000\r\n";

    @TempDir
    Path directory;

    @Test
    void archivesTheOriginalBytesPerAttemptAndHashesExactlyThoseBytes() throws Exception {
        byte[] bytes = CSV.getBytes(MS949);
        Path file = Files.write(directory.resolve("pension.csv"), bytes);
        PensionIncomeCsvSourceAdapter adapter = adapter();

        PensionIncomeSource source = adapter.read(request(file, "MS949"));

        assertThat(source.headers()).containsExactly("기준년월", "시군구", "평균소득월액");
        assertThat(source.records()).containsExactly(
            new PensionIncomeSourceRecord(1, List.of("2024-12", "서울특별시종로구", "1555244")),
            new PensionIncomeSourceRecord(2, List.of("2024-12", "부산광역시중구", "1300000")));
        assertThat(source.receipt().inputRows()).isEqualTo(2);
        assertThat(source.receipt().checksum()).isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));
        Path archive = Path.of(source.receipt().rawLocation());
        assertThat(archive.getFileName().toString()).startsWith("pension-2024-001-");
        assertThat(Files.readAllBytes(archive.resolve("source.csv"))).isEqualTo(bytes);

        PensionIncomeSource retry = adapter.read(request(file, "MS949"));
        assertThat(retry.receipt().rawLocation()).isNotEqualTo(source.receipt().rawLocation());
        assertThat(retry.receipt().checksum()).isEqualTo(source.receipt().checksum());
    }

    @Test
    void utf8FileWithBomIsReadWithoutTheBomInTheFirstHeader() throws Exception {
        Path file = Files.write(directory.resolve("pension-utf8.csv"), ("﻿" + CSV).getBytes(StandardCharsets.UTF_8));

        PensionIncomeSource source = adapter().read(request(file, "UTF-8"));

        assertThat(source.headers()).containsExactly("기준년월", "시군구", "평균소득월액");
        assertThat(source.records()).hasSize(2);
    }

    @Test
    void utf8FileDeclaredAsMs949FailsInsteadOfDecodingGarbage() throws Exception {
        Path file = Files.write(directory.resolve("pension-utf8.csv"), CSV.getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> adapter().read(request(file, "MS949")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not valid MS949");
    }

    @Test
    void cp949FileDeclaredAsUtf8FailsInsteadOfDecodingReplacementCharacters() throws Exception {
        Path file = Files.write(directory.resolve("pension.csv"), CSV.getBytes(MS949));

        assertThatThrownBy(() -> adapter().read(request(file, "UTF-8")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not valid UTF-8").hasMessageContaining("portal original is MS949");
    }

    @Test
    void missingOrEmptyFilesFailClosed() throws Exception {
        assertThatThrownBy(() -> adapter().read(request(directory.resolve("absent.csv"), "MS949")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("not found");
        Path empty = Files.write(directory.resolve("empty.csv"), new byte[0]);
        assertThatThrownBy(() -> adapter().read(request(empty, "MS949")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("no header");
    }

    private PensionIncomeCsvSourceAdapter adapter() {
        return new PensionIncomeCsvSourceAdapter(directory.resolve("raw"));
    }

    private static PensionIncomeImportRequest request(Path file, String charset) {
        return new PensionIncomeImportRequest("pension-2024-001", file, charset, "legacy-20233", 125,
            Instant.parse("2025-01-31T00:00:00Z"), true);
    }
}
