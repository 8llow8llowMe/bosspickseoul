package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeDistrictRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSource;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSourceRecord;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DistrictCodeLookupPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeDistrictBulkPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeSourcePort;
import com.followfollowme.bosspickseoul.shared.enums.FileDatasetKey;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 국민연금 자치구 평균소득 파일의 검증·변환 정본(이슈 #415). 원천은 전국 시군구 × 기준년월이고, 서울 25구만 채택한다.
 *
 * <p>fail-closed 다. 아래 위반이 하나라도 있으면 아무것도 쓰지 않고, 운영자가 한 번에 고칠 수 있게 위반을 전부 모아 한 예외로 알린다.
 * 거부 행 테이블은 두지 않는다 — 연 1회 1,150행 파일이라 메시지의 행 번호로 원본(보관본)을 바로 열어 보면 된다.
 * <ol>
 *   <li>헤더가 {@link FileDatasetKey#NPS_DISTRICT_AVERAGE_INCOME} 와 순서까지 같다(다르면 행을 보지 않고 멈춘다)</li>
 *   <li>행마다 필드 3개, 기준년월 {@code yyyy-MM}, 금액은 13자리 이하 양의 정수. 타 시도 행도 검사한다 — 형식이 깨진 행은 파일 전체를 의심할 근거다</li>
 *   <li>{@code 서울특별시} 로 시작하는 행만 채택한다. 다른 시도에도 중구·동구·서구가 있어 구 이름만으로 고르지 않는다</li>
 *   <li>접두를 떼고 공백을 지운 이름이 공간 스냅샷 자치구 이름과 정확히 같아야 한다. 비슷한 이름을 추측해 붙이지 않는다</li>
 *   <li>기준년월마다 서울 25행, (기준년월, 구) 중복 없음, 25구 모두 등장</li>
 *   <li>서울 행 합계가 {@code expectedRows} 와 같다</li>
 * </ol>
 *
 * <p>트랜잭션을 열지 않는다. Job 스텝이 commercial 트랜잭션 안에서 부르고, 교체 쓰기는 포트 어댑터가 같은 매니저로 묶는다.
 */
@Component
@RequiredArgsConstructor
public class PensionIncomeImportProcessor {

    private static final Logger log = LoggerFactory.getLogger(PensionIncomeImportProcessor.class);
    static final String SEOUL_PREFIX = "서울특별시";
    static final int SEOUL_DISTRICTS = 25;
    private static final Pattern REFERENCE_MONTH = Pattern.compile("20\\d{2}-(0[1-9]|1[0-2])");
    private static final Pattern AMOUNT = Pattern.compile("[0-9]{1,13}");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    /** 위반 종류마다 보여 줄 행 번호 수. 문자셋을 잘못 고른 파일은 전 행이 위반이라 그대로 두면 메시지가 끝없이 길어진다. 건수는 전부 센다. */
    private static final int SHOWN_ROW_NUMBERS = 20;

    private final PensionIncomeSourcePort source;
    private final DistrictCodeLookupPort districtCodes;
    private final PensionIncomeDistrictBulkPort districtIncomes;

    public PensionIncomeImportResult importFile(PensionIncomeImportRequest request) {
        PensionIncomeSource file = source.read(request);
        List<String> expectedHeaders = FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME.headers();
        if (!expectedHeaders.equals(file.headers())) {
            // 열 이름으로 다시 맞추지 않는다. 원천이 형식을 바꿨으면 사람이 확인하고 공유 계약부터 고친다.
            throw new IllegalArgumentException("Pension income header mismatch: expected=" + expectedHeaders + " actual=" + file.headers());
        }
        Map<String, String> codesByName = districtCodes.districtCodesByName(request.spatialVersion());
        if (codesByName.size() != SEOUL_DISTRICTS) {
            throw new IllegalStateException("spatialVersion=" + request.spatialVersion() + " has " + codesByName.size()
                + " READY DISTRICT areas, expected " + SEOUL_DISTRICTS);
        }

        Violations violations = new Violations();
        List<PensionIncomeRow> rows = parse(file.records(), expectedHeaders.size(), violations);
        List<PensionIncomeRow> seoul = rows.stream().filter(row -> row.sourceRegionName().strip().startsWith(SEOUL_PREFIX)).toList();
        int ignoredNonSeoul = rows.size() - seoul.size();
        List<PensionIncomeDistrictRow> districtRows = toDistrictRows(seoul, codesByName, violations);
        if (seoul.size() != request.expectedRows()) {
            violations.add("seoulRows=" + seoul.size() + " expectedRows=" + request.expectedRows());
        }
        violations.throwIfAny();

        SortedSet<LocalDate> referenceDates = new TreeSet<>();
        seoul.forEach(row -> referenceDates.add(row.referenceMonth().atEndOfMonth()));
        if (request.dryRun()) {
            log.info("[pension-income] dry-run referenceDates={} rows={} ignoredNonSeoul={} runId={} checksum={}",
                referenceDates, districtRows.size(), ignoredNonSeoul, request.runId(), file.receipt().checksum());
            return new PensionIncomeImportResult(file.receipt(), List.copyOf(referenceDates), seoul.size(), ignoredNonSeoul, false);
        }
        int written = districtIncomes.replace(
            new PensionIncomeSnapshot(request.runId(), file.receipt().checksum(), request.sourceUpdatedAt(), districtRows));
        log.info("[pension-income] published referenceDates={} rows={} ignoredNonSeoul={} runId={} checksum={}",
            referenceDates, written, ignoredNonSeoul, request.runId(), file.receipt().checksum());
        return new PensionIncomeImportResult(file.receipt(), List.copyOf(referenceDates), seoul.size(), ignoredNonSeoul, true);
    }

    private static List<PensionIncomeRow> parse(List<PensionIncomeSourceRecord> records, int fieldCount, Violations violations) {
        List<PensionIncomeRow> rows = new ArrayList<>(records.size());
        for (PensionIncomeSourceRecord record : records) {
            List<String> values = record.values();
            if (values.size() != fieldCount) {
                violations.row("field count != " + fieldCount, record.rowNumber());
                continue;
            }
            boolean valid = true;
            if (!REFERENCE_MONTH.matcher(values.get(0)).matches()) {
                violations.row("invalid reference month", record.rowNumber());
                valid = false;
            }
            if (values.get(1).isBlank()) {
                violations.row("blank region name", record.rowNumber());
                valid = false;
            }
            if (!AMOUNT.matcher(values.get(2)).matches() || Long.parseLong(values.get(2)) == 0) {
                violations.row("invalid amount", record.rowNumber());
                valid = false;
            }
            if (valid) {
                rows.add(new PensionIncomeRow(record.rowNumber(), YearMonth.parse(values.get(0)), values.get(1), Long.parseLong(values.get(2))));
            }
        }
        return rows;
    }

    /**
     * 서울 행을 자치구 코드에 붙이고 기준년월마다 25구가 정확히 한 번씩 있는지 본다. 코드 대조는 메모리 맵 조회다(포트는 run 시작에 한 번).
     */
    private static List<PensionIncomeDistrictRow> toDistrictRows(List<PensionIncomeRow> seoul, Map<String, String> codesByName, Violations violations) {
        Map<String, String> namesByCode = new TreeMap<>();
        codesByName.forEach((name, code) -> namesByCode.put(code, name));
        SortedSet<String> unmapped = new TreeSet<>();
        Map<YearMonth, Integer> seoulRowsByMonth = new TreeMap<>();
        Map<YearMonth, Map<String, List<Long>>> rowNumbersByMonthAndCode = new TreeMap<>();
        List<PensionIncomeDistrictRow> districtRows = new ArrayList<>(seoul.size());
        for (PensionIncomeRow row : seoul) {
            seoulRowsByMonth.merge(row.referenceMonth(), 1, Integer::sum);
            String name = WHITESPACE.matcher(row.sourceRegionName().strip().substring(SEOUL_PREFIX.length())).replaceAll("");
            String code = codesByName.get(name);
            if (code == null) {
                unmapped.add(row.sourceRegionName());
                continue;
            }
            rowNumbersByMonthAndCode.computeIfAbsent(row.referenceMonth(), month -> new TreeMap<>())
                .computeIfAbsent(code, ignored -> new ArrayList<>()).add(row.rowNumber());
            districtRows.add(new PensionIncomeDistrictRow(row.referenceMonth().atEndOfMonth(), code, name, row.sourceRegionName(), row.amount()));
        }
        if (!unmapped.isEmpty()) violations.add("unmapped Seoul region names=" + unmapped);
        seoulRowsByMonth.forEach((month, count) -> {
            if (count != SEOUL_DISTRICTS) violations.add("referenceMonth=" + month + " seoulRows=" + count + " expected=" + SEOUL_DISTRICTS);
            Map<String, List<Long>> rowNumbersByCode = rowNumbersByMonthAndCode.getOrDefault(month, Map.of());
            rowNumbersByCode.forEach((code, rowNumbers) -> {
                if (rowNumbers.size() > 1) {
                    violations.add("referenceMonth=" + month + " duplicate district=" + namesByCode.get(code) + "(" + code + ") rows=" + rowNumbers);
                }
            });
            List<String> missing = namesByCode.entrySet().stream()
                .filter(district -> !rowNumbersByCode.containsKey(district.getKey()))
                .map(district -> district.getValue() + "(" + district.getKey() + ")").toList();
            if (!missing.isEmpty()) violations.add("referenceMonth=" + month + " missing districts=" + missing);
        });
        districtRows.sort(Comparator.comparing(PensionIncomeDistrictRow::referenceDate).thenComparing(PensionIncomeDistrictRow::districtCode));
        return districtRows;
    }

    /** 위반을 모아 한 번에 던진다. 행 단위 위반은 종류별로 건수와 앞쪽 행 번호를, 나머지는 문장 그대로 싣는다. */
    private static final class Violations {
        private final Map<String, List<Long>> rowNumbersByKind = new LinkedHashMap<>();
        private final List<String> messages = new ArrayList<>();

        void row(String kind, long rowNumber) {
            rowNumbersByKind.computeIfAbsent(kind, ignored -> new ArrayList<>()).add(rowNumber);
        }

        void add(String message) {
            messages.add(message);
        }

        void throwIfAny() {
            if (rowNumbersByKind.isEmpty() && messages.isEmpty()) return;
            List<String> parts = new ArrayList<>();
            rowNumbersByKind.forEach((kind, rowNumbers) -> parts.add(kind + " count=" + rowNumbers.size() + " rows=" + shown(rowNumbers)));
            parts.addAll(messages);
            throw new IllegalArgumentException("Pension income validation failed: " + String.join("; ", parts));
        }

        private static String shown(List<Long> rowNumbers) {
            if (rowNumbers.size() <= SHOWN_ROW_NUMBERS) return rowNumbers.toString();
            String head = rowNumbers.subList(0, SHOWN_ROW_NUMBERS).toString();
            return head.substring(0, head.length() - 1) + ", ...]";
        }
    }
}
