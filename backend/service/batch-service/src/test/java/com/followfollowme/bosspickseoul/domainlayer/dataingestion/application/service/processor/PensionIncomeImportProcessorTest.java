package com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeDistrictRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeImportResult;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSource;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.PensionIncomeSourceRecord;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SourceReceipt;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DistrictCodeLookupPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.PensionIncomeDistrictBulkPort;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * 국민연금 자치구 평균소득 검증 규칙. 원천 행은 시도와 붙은 시군구 이름({@code 서울특별시종로구})으로만 오고, 다른 시도에도 같은 이름의
 * 구(중구 등)가 있다. 위반은 하나라도 있으면 쓰지 않고, 운영자가 한 번에 고칠 수 있게 모두 모아 알린다.
 */
class PensionIncomeImportProcessorTest {

    private static final List<String> HEADERS = List.of("기준년월", "시군구", "평균소득월액");
    private static final String SPATIAL_VERSION = "legacy-20233";
    private static final SourceReceipt RECEIPT = new SourceReceipt("a".repeat(64), "/raw/pension-001-1", 0);

    /** 서울 25구. 코드는 행정표준코드 앞 5자리(공간 스냅샷 DISTRICT 코드)다. */
    private static final Map<String, String> SEOUL = new LinkedHashMap<>();

    static {
        String[][] districts = {
            {"종로구", "11110"}, {"중구", "11140"}, {"용산구", "11170"}, {"성동구", "11200"}, {"광진구", "11215"},
            {"동대문구", "11230"}, {"중랑구", "11260"}, {"성북구", "11290"}, {"강북구", "11305"}, {"도봉구", "11320"},
            {"노원구", "11350"}, {"은평구", "11380"}, {"서대문구", "11410"}, {"마포구", "11440"}, {"양천구", "11470"},
            {"강서구", "11500"}, {"구로구", "11530"}, {"금천구", "11545"}, {"영등포구", "11560"}, {"동작구", "11590"},
            {"관악구", "11620"}, {"서초구", "11650"}, {"강남구", "11680"}, {"송파구", "11710"}, {"강동구", "11740"}};
        for (String[] district : districts) SEOUL.put(district[0], district[1]);
    }

    private final DistrictCodeLookupPort districtCodes = mock(DistrictCodeLookupPort.class);
    private final PensionIncomeDistrictBulkPort districtIncomes = mock(PensionIncomeDistrictBulkPort.class);

    @BeforeEach
    void setUp() {
        when(districtCodes.districtCodesByName(SPATIAL_VERSION)).thenReturn(Map.copyOf(SEOUL));
    }

    @Test
    void publishesSeoulDistrictsPerMonthAndIgnoresOtherProvincesWithTheSameDistrictName() {
        List<List<String>> lines = new ArrayList<>();
        for (String month : List.of("2023-12", "2024-12")) {
            lines.addAll(seoulMonth(month));
            lines.add(List.of(month, "부산광역시중구", "1300000"));
            lines.add(List.of(month, "대구광역시중구", "1310000"));
            lines.add(List.of(month, "경기도수원시장안구", "1400000"));
        }
        when(districtIncomes.replace(any())).thenAnswer(invocation -> invocation.<PensionIncomeSnapshot>getArgument(0).rows().size());

        PensionIncomeImportResult result = processor(HEADERS, lines).importFile(request(50, false));

        ArgumentCaptor<PensionIncomeSnapshot> captor = ArgumentCaptor.forClass(PensionIncomeSnapshot.class);
        verify(districtIncomes).replace(captor.capture());
        PensionIncomeSnapshot snapshot = captor.getValue();
        assertThat(snapshot.referenceDates()).containsExactly(LocalDate.of(2023, 12, 31), LocalDate.of(2024, 12, 31));
        assertThat(snapshot.rows()).hasSize(50);
        assertThat(snapshot.runId()).isEqualTo("pension-2024-001");
        assertThat(snapshot.sourceChecksum()).isEqualTo(RECEIPT.checksum());
        assertThat(snapshot.sourceUpdatedAt()).isEqualTo(Instant.parse("2025-01-31T00:00:00Z"));
        // 서울 중구만 서울 코드로 들어가고, 부산·대구 중구 금액은 섞이지 않는다.
        assertThat(snapshot.rows()).filteredOn(row -> row.districtCode().equals("11140"))
            .extracting(PensionIncomeDistrictRow::sourceRegionName, PensionIncomeDistrictRow::districtName)
            .containsOnly(tuple("서울특별시중구", "중구"));
        assertThat(snapshot.rows()).filteredOn(row -> row.districtCode().equals("11140"))
            .extracting(PensionIncomeDistrictRow::averageMonthlyIncomeAmount).doesNotContain(1300000L, 1310000L);
        assertThat(snapshot.rows().getFirst()).isEqualTo(
            new PensionIncomeDistrictRow(LocalDate.of(2023, 12, 31), "11110", "종로구", "서울특별시종로구", amount("종로구")));
        assertThat(result.published()).isTrue();
        assertThat(result.seoulRows()).isEqualTo(50);
        assertThat(result.ignoredNonSeoulRows()).isEqualTo(6);
        assertThat(result.receipt()).isEqualTo(RECEIPT);
    }

    @Test
    void dryRunValidatesEverythingButNeverWrites() {
        PensionIncomeImportResult result = processor(HEADERS, seoulMonth("2024-12")).importFile(request(25, true));

        verifyNoInteractions(districtIncomes);
        assertThat(result.published()).isFalse();
        assertThat(result.referenceDates()).containsExactly(LocalDate.of(2024, 12, 31));
        assertThat(result.seoulRows()).isEqualTo(25);
        assertThat(result.ignoredNonSeoulRows()).isZero();
    }

    @Test
    void referenceDateIsTheLastDayOfTheReferenceMonth() {
        PensionIncomeImportResult result = processor(HEADERS, seoulMonth("2024-02")).importFile(request(25, true));

        assertThat(result.referenceDates()).containsExactly(LocalDate.of(2024, 2, 29));
    }

    @Test
    void headerMustMatchTheSharedContractInOrderBeforeAnythingIsLookedUp() {
        for (List<String> headers : List.of(List.of("시군구", "기준년월", "평균소득월액"), List.of("기준년월", "시군구", "평균소득"),
            List.of("기준년월", "시군구", "평균소득월액", "비고"))) {
            assertThatThrownBy(() -> processor(headers, seoulMonth("2024-12")).importFile(request(25, false)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("header mismatch");
        }
        verifyNoInteractions(districtCodes, districtIncomes);
    }

    @Test
    void spatialVersionWithoutTwentyFiveReadyDistrictsStops() {
        when(districtCodes.districtCodesByName(SPATIAL_VERSION)).thenReturn(Map.of());

        assertThatThrownBy(() -> processor(HEADERS, seoulMonth("2024-12")).importFile(request(25, false)))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("spatialVersion=legacy-20233").hasMessageContaining("READY");
        verifyNoInteractions(districtIncomes);
    }

    @Test
    void everyRowFormatViolationIsReportedTogetherWithItsRowNumber() {
        List<List<String>> lines = new ArrayList<>(seoulMonth("2024-12"));
        lines.add(List.of("2024-12", "부산광역시중구"));
        lines.add(List.of("2024-13", "부산광역시동구", "1300000"));
        lines.add(List.of("202412", "부산광역시서구", "1300000"));
        lines.add(List.of("2024-12", "부산광역시남구", "0"));
        lines.add(List.of("2024-12", "부산광역시북구", "1,300,000"));
        lines.add(List.of("2024-12", "", "1300000"));

        assertThatThrownBy(() -> processor(HEADERS, lines).importFile(request(25, false)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("field count != 3 count=1 rows=[26]")
            .hasMessageContaining("invalid reference month count=2 rows=[27, 28]")
            .hasMessageContaining("invalid amount count=2 rows=[29, 30]")
            .hasMessageContaining("blank region name count=1 rows=[31]");
        verifyNoInteractions(districtIncomes);
    }

    @Test
    void unmappedSeoulNamesAreListedAndTheirDistrictIsReportedMissing() {
        List<List<String>> lines = seoulMonth("2024-12");
        lines.set(0, List.of("2024-12", "서울특별시가상구", "1500000"));

        assertThatThrownBy(() -> processor(HEADERS, lines).importFile(request(25, false)))
            .hasMessageContaining("unmapped Seoul region names=[서울특별시가상구]")
            .hasMessageContaining("referenceMonth=2024-12 missing districts=[종로구(11110)]");
        verifyNoInteractions(districtIncomes);
    }

    @Test
    void whitespaceInsideTheDistrictPartIsRemovedBeforeMatching() {
        List<List<String>> lines = seoulMonth("2024-12");
        lines.set(0, List.of("2024-12", "서울특별시 종로구", "1555244"));

        PensionIncomeImportResult result = processor(HEADERS, lines).importFile(request(25, true));

        assertThat(result.seoulRows()).isEqualTo(25);
    }

    @Test
    void eachMonthNeedsExactlyTwentyFiveDistinctDistricts() {
        List<List<String>> shortMonth = seoulMonth("2023-12");
        shortMonth.removeLast();
        List<List<String>> duplicated = seoulMonth("2024-12");
        duplicated.add(List.of("2024-12", "서울특별시종로구", "1555245"));
        List<List<String>> lines = new ArrayList<>(shortMonth);
        lines.addAll(duplicated);

        assertThatThrownBy(() -> processor(HEADERS, lines).importFile(request(50, false)))
            .hasMessageContaining("referenceMonth=2023-12 seoulRows=24 expected=25")
            .hasMessageContaining("referenceMonth=2023-12 missing districts=[강동구(11740)]")
            .hasMessageContaining("referenceMonth=2024-12 seoulRows=26 expected=25")
            .hasMessageContaining("referenceMonth=2024-12 duplicate district=종로구(11110) rows=[25, 50]");
        verifyNoInteractions(districtIncomes);
    }

    @Test
    void seoulRowCountMustEqualExpectedRows() {
        assertThatThrownBy(() -> processor(HEADERS, seoulMonth("2024-12")).importFile(request(125, false)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("seoulRows=25 expectedRows=125");
        verifyNoInteractions(districtIncomes);
    }

    @Test
    void longViolationListsKeepTheCountButShowTheFirstRowNumbersOnly() {
        List<List<String>> lines = new ArrayList<>();
        for (int i = 0; i < 30; i++) lines.add(List.of("2024-12", "부산광역시중구", "0"));

        assertThatThrownBy(() -> processor(HEADERS, lines).importFile(request(25, false)))
            .hasMessageContaining("invalid amount count=30 rows=[1, 2, 3")
            .hasMessageContaining("20, ...]")
            .hasMessageNotContaining("21, ");
    }

    private PensionIncomeImportProcessor processor(List<String> headers, List<List<String>> lines) {
        List<PensionIncomeSourceRecord> records = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) records.add(new PensionIncomeSourceRecord(i + 1, lines.get(i)));
        return new PensionIncomeImportProcessor(request -> new PensionIncomeSource(headers, records, RECEIPT), districtCodes, districtIncomes);
    }

    private static PensionIncomeImportRequest request(long expectedRows, boolean dryRun) {
        return new PensionIncomeImportRequest("pension-2024-001", Path.of("pension.csv"), "UTF-8", SPATIAL_VERSION, expectedRows,
            Instant.parse("2025-01-31T00:00:00Z"), dryRun);
    }

    /** 원천 순서대로 서울 25구 한 달분. 금액은 구마다 다르게 둔다. */
    private static List<List<String>> seoulMonth(String month) {
        List<List<String>> lines = new ArrayList<>();
        SEOUL.keySet().forEach(name -> lines.add(List.of(month, "서울특별시" + name, Long.toString(amount(name)))));
        return lines;
    }

    private static long amount(String districtName) {
        return 1_400_000L + Integer.parseInt(SEOUL.get(districtName).substring(2));
    }
}
