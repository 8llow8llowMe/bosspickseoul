package com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.FactRow;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.ServiceTypeResolver;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.TypedFactMappers;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.domain.model.Dataset;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * typed 이관은 {@code TypedFactMappers} 가 만든 배열을 INSERT 의 바인딩 자리에 순서대로 넣는다.
 * 둘의 개수가 어긋나면 컴파일도 단위 테스트도 통과하고 개발 DB 실행에서야 드러나므로 여기서 대조한다.
 */
class TypedProjectionSqlTest {

    @Test
    void everyTypedInsertHasAsManyPlaceholdersAsItsMapperProduces() {
        for (Dataset dataset : Dataset.values()) {
            String insertSql = ChangeCommercialProjectionJdbcAdapter.insertSql(dataset);
            if (insertSql == null) {
                // CHANGE_COMMERCIAL 만 전용 매퍼(ChangeCommercialTypedMapper)와 전용 INSERT 를 쓴다.
                assertThat(dataset).isEqualTo(Dataset.CHANGE_COMMERCIAL);
                continue;
            }
            Object[] row = TypedFactMappers.columns(
                dataset, new FactRow(1L, areaCode(dataset), "CS100001", completeFields(dataset)),
                "20241", "legacy-20233", ServiceTypeResolver.empty());
            assertThat(placeholders(insertSql)).as("%s", dataset).isEqualTo(row.length);
        }
    }

    /**
     * 행정동 소비는 총액 + 세부 10항목이다(이슈 #415). 컬럼 순서는 income_administration INSERT 와 같아야 하고,
     * 여가·문화는 원천이 합산본만 주므로 한 자리다.
     */
    @Test
    void administrationConsumptionCarriesTheTotalAndAllTenDetailItems() {
        Map<String, String> fields = completeFields(Dataset.CONSUMPTION_ADMINISTRATION);
        fields.put("ADSTRD_CD_NM", "사직동");
        fields.put("EXPNDTR_TOTAMT", "530670000");
        fields.put("FDSTFFS_EXPNDTR_TOTAMT", "101");
        fields.put("CLTHS_FTWR_EXPNDTR_TOTAMT", "102");
        fields.put("LVSPL_EXPNDTR_TOTAMT", "103");
        fields.put("MCP_EXPNDTR_TOTAMT", "104");
        fields.put("TRNSPORT_EXPNDTR_TOTAMT", "-3186000");
        fields.put("EDC_EXPNDTR_TOTAMT", "106");
        fields.put("PLESR_EXPNDTR_TOTAMT", "0");
        fields.put("LSR_CLTUR_EXPNDTR_TOTAMT", "108");
        fields.put("ETC_EXPNDTR_TOTAMT", "109");
        fields.put("FD_EXPNDTR_TOTAMT", "110");

        Object[] row = TypedFactMappers.columns(
            Dataset.CONSUMPTION_ADMINISTRATION, new FactRow(1L, "11110515", "", fields),
            "20241", "legacy-20233", ServiceTypeResolver.empty());

        assertThat(row).containsExactly(
            "20241", "legacy-20233", "11110515", "사직동", 530670000L,
            101L, 102L, 103L, 104L, -3186000L, 106L, 0L, 108L, 109L, 110L);

        // 컬럼 이름은 부분 문자열로 보면 leisure_culture 가 culture 를 품으므로 목록으로 쪼개 대조한다.
        // 상권의 leisure_expense_amount / culture_expense_amount 와 같은 이름을 쓰면 정의가 다른 값이 같은 이름이 된다.
        assertThat(insertColumns(Dataset.CONSUMPTION_ADMINISTRATION)).containsExactly(
            "period_code", "spatial_version", "administration_code", "administration_name", "total_expense_amount",
            "grocery_expense_amount", "clothing_expense_amount", "household_expense_amount", "medical_expense_amount",
            "transportation_expense_amount", "education_expense_amount", "entertainment_expense_amount",
            "leisure_culture_expense_amount", "other_expense_amount", "dining_expense_amount");
    }

    /** INSERT 문 앞쪽 괄호 안의 컬럼 목록. */
    private static List<String> insertColumns(Dataset dataset) {
        String sql = ChangeCommercialProjectionJdbcAdapter.insertSql(dataset);
        String columns = sql.substring(sql.indexOf('(') + 1, sql.indexOf(')'));
        return Arrays.stream(columns.split(",")).map(String::trim).toList();
    }

    private static int placeholders(String sql) {
        return (int) sql.chars().filter(character -> character == '?').count();
    }

    private static String areaCode(Dataset dataset) {
        return switch (dataset.scope()) {
            case COMMERCIAL -> "3110008";
            case DISTRICT -> "11110";
            case ADMINISTRATION -> "11110515";
        };
    }

    private static Map<String, String> completeFields(Dataset dataset) {
        Map<String, String> fields = new HashMap<>();
        fields.put("STDR_YYQU_CD", "20241");
        for (String key : dataset.requiredMetrics()) {
            fields.put(key, key.endsWith("_RT") ? "1.5" : "10");
        }
        fields.put("TRDAR_SE_CD", "A");
        fields.put("TRDAR_SE_CD_NM", "골목상권");
        fields.put("TRDAR_CD_NM", "배화");
        fields.put("SIGNGU_CD_NM", "종로구");
        fields.put("ADSTRD_CD_NM", "사직동");
        fields.put("SVC_INDUTY_CD", "CS100001");
        fields.put("SVC_INDUTY_CD_NM", "한식음식점");
        return fields;
    }
}
