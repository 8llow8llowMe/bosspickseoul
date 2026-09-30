package com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * 분기 인자 존중 여부·고정 행 수·적재 순서는 코드({@link Dataset}), 수동 계획 스크립트(ps1), 커버리지 SQL 세 곳에 적혀 있다.
 * 자동 최신화는 코드 값만 보므로, 한쪽만 고치면 수동 run 과 자동 run 이 다른 판단을 한다. 여기서 두 파일을 읽어 대조한다.
 */
class DatasetCatalogConsistencyTest {

    // 테스트 작업 디렉터리는 모듈 루트(backend/service/batch-service)다.
    private static final Path SCRIPTS = Path.of("..", "..", "scripts");
    private static final Pattern PS1_ROW = Pattern.compile(
        "Order = (\\d+);\\s+Name = '([A-Z_]+)';.*HonorsPeriod = \\$(true|false);\\s+FixedRows = (\\$null|\\d+);");
    private static final Pattern SQL_ROW = Pattern.compile("SELECT '([A-Z_]+)',\\s+'[A-Z]+',\\s+'(honoured|ignored)',\\s+(\\d+)");

    @Test
    void sixDatasetsHonourTheQuarterArgumentAndNineIgnoreIt() {
        assertThat(Arrays.stream(Dataset.values()).filter(Dataset::quarterArgumentHonoured))
            .containsExactlyInAnyOrder(Dataset.CHANGE_COMMERCIAL, Dataset.FOOT_TRAFFIC_COMMERCIAL, Dataset.SALES_ADMINISTRATION,
                Dataset.SALES_COMMERCIAL, Dataset.STORE_ADMINISTRATION, Dataset.STORE_COMMERCIAL);
        assertThat(Arrays.stream(Dataset.values()).filter(dataset -> !dataset.quarterArgumentHonoured())).hasSize(9);
    }

    @Test
    void fixedRowCountsAreOnlyTheOnesConfirmedByPublishedRuns() {
        assertThat(Dataset.CHANGE_COMMERCIAL.fixedRowsPerQuarter()).isEqualTo(OptionalLong.of(1650));
        assertThat(Dataset.CHANGE_DISTRICT.fixedRowsPerQuarter()).isEqualTo(OptionalLong.of(25));
        assertThat(Dataset.FOOT_TRAFFIC_DISTRICT.fixedRowsPerQuarter()).isEqualTo(OptionalLong.of(25));
        assertThat(Dataset.CONSUMPTION_DISTRICT.fixedRowsPerQuarter()).isEqualTo(OptionalLong.of(25));
        assertThat(Dataset.SALES_DISTRICT.fixedRowsPerQuarter()).isEmpty();
        assertThat(Dataset.STORE_COMMERCIAL.fixedRowsPerQuarter()).isEmpty();
    }

    @Test
    void runOrderCoversEveryDatasetOnce() {
        assertThat(Dataset.inRunOrder()).containsExactlyInAnyOrder(Dataset.values());
        assertThat(Dataset.CHANGE_COMMERCIAL.runOrder()).isEqualTo(1);
        assertThat(Dataset.STORE_COMMERCIAL.runOrder()).isEqualTo(15);
    }

    @Test
    void quarterlyImportPlanScriptAgreesWithTheCode() throws IOException {
        List<String> lines = Files.readAllLines(SCRIPTS.resolve("batch/quarterly-import-plan.ps1"), StandardCharsets.UTF_8);
        Map<Dataset, Matcher> rows = new LinkedHashMap<>();
        for (String line : lines) {
            Matcher matcher = PS1_ROW.matcher(line);
            if (matcher.find()) {
                rows.put(Dataset.valueOf(matcher.group(2)), matcher);
            }
        }
        assertThat(rows.keySet()).containsExactlyElementsOf(Dataset.inRunOrder());
        rows.forEach((dataset, row) -> {
            assertThat(Integer.parseInt(row.group(1))).as("%s order", dataset).isEqualTo(dataset.runOrder());
            assertThat(Boolean.parseBoolean(row.group(3))).as("%s HonorsPeriod", dataset).isEqualTo(dataset.quarterArgumentHonoured());
            OptionalLong fixed = "$null".equals(row.group(4)) ? OptionalLong.empty() : OptionalLong.of(Long.parseLong(row.group(4)));
            assertThat(fixed).as("%s FixedRows", dataset).isEqualTo(dataset.fixedRowsPerQuarter());
        });
    }

    @Test
    void coverageSqlCatalogAgreesWithTheCode() throws IOException {
        String sql = Files.readString(SCRIPTS.resolve("migration/quarterly-import-coverage.sql"), StandardCharsets.UTF_8);
        Matcher matcher = SQL_ROW.matcher(sql);
        List<Dataset> ordered = new ArrayList<>();
        while (matcher.find()) {
            Dataset dataset = Dataset.valueOf(matcher.group(1));
            ordered.add(dataset);
            assertThat("honoured".equals(matcher.group(2))).as("%s period_arg", dataset).isEqualTo(dataset.quarterArgumentHonoured());
            assertThat(Integer.parseInt(matcher.group(3))).as("%s run_order", dataset).isEqualTo(dataset.runOrder());
        }
        assertThat(ordered).containsExactlyElementsOf(Dataset.inRunOrder());
    }
}
