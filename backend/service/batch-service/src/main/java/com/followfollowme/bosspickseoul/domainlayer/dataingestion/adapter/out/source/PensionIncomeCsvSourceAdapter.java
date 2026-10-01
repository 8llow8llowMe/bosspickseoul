package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSource;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSourceRecord;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceReceipt;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeSourcePort;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/**
 * 운영자가 내려받은 국민연금 시군구 평균소득 CSV(이슈 #415). 분기 적재 CSV 경로({@code SeoulDatasetSourceAdapter.FileSession})와 같은 방식이다.
 * 원본을 run 마다 새 보관 디렉터리({@code <runId>-*}/source.csv)로 복사하면서 SHA-256 을 계산하고, 보관본을 읽는다.
 *
 * <p>원본은 CP949(MS949)다. 디코더는 잘못된 바이트를 대체 문자로 바꾸지 않고 멈춘다 — 문자셋을 잘못 주면 한글 시군구 이름이 조용히
 * 깨져 서울 행이 하나도 안 잡히거나, 더 나쁘게는 일부만 잡힌다. UTF-8 BOM 은 {@link CsvRecordReader} 가 떼어 낸다.
 * 1,150행 규모라 스트리밍하지 않고 한 번에 읽는다.
 */
public final class PensionIncomeCsvSourceAdapter implements PensionIncomeSourcePort {

    private final Path rawDirectory;

    public PensionIncomeCsvSourceAdapter(Path rawDirectory) {
        this.rawDirectory = rawDirectory;
    }

    @Override
    public PensionIncomeSource read(PensionIncomeImportRequest request) {
        MessageDigest digest = sha256();
        Path copy;
        try {
            Path root = rawDirectory.toAbsolutePath().normalize();
            Files.createDirectories(root);
            // 같은 runId 재시도도 새 디렉터리를 쓴다. 이전 시도의 보관본을 덮어쓰지 않는다.
            copy = Files.createTempDirectory(root, request.runId() + "-").resolve("source.csv");
            try (InputStream original = Files.newInputStream(request.sourceFile());
                 DigestInputStream checked = new DigestInputStream(original, digest)) {
                Files.copy(checked, copy);
            }
        } catch (NoSuchFileException e) {
            throw new IllegalArgumentException("Pension income source file not found");
        } catch (IOException e) {
            throw new IllegalStateException("Cannot archive pension income source file");
        }
        try (Reader reader = new InputStreamReader(Files.newInputStream(copy), Charset.forName(request.charset()).newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT))) {
            CsvRecordReader csv = new CsvRecordReader(reader);
            List<String> headers = csv.read();
            if (headers == null) throw new IllegalArgumentException("Pension income CSV has no header");
            List<PensionIncomeSourceRecord> records = new ArrayList<>();
            for (List<String> values = csv.read(); values != null; values = csv.read()) {
                records.add(new PensionIncomeSourceRecord(records.size() + 1L, values));
            }
            SourceReceipt receipt = new SourceReceipt(HexFormat.of().formatHex(digest.digest()), copy.getParent().toString(), records.size());
            return new PensionIncomeSource(headers, records, receipt);
        } catch (CharacterCodingException e) {
            // 포털 원본은 MS949 다. 엑셀 등으로 다시 저장한 사본은 UTF-8 일 수 있어 어느 쪽인지 단정하지 않는다.
            throw new IllegalArgumentException("Pension income CSV is not valid " + request.charset() + "; check --charset (portal original is MS949)");
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read archived pension income CSV");
        }
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable");
        }
    }
}
