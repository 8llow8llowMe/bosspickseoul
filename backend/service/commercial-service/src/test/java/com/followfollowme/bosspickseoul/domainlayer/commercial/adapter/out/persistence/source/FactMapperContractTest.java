package com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactEntity;
import com.followfollowme.bosspickseoul.domainlayer.dataset.adapter.out.persistence.entity.DatasetFactId;
import com.followfollowme.bosspickseoul.domainlayer.dataset.application.exception.DatasetException;
import com.followfollowme.bosspickseoul.shared.enums.DatasetKey;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;

/**
 * 매퍼가 fail-closed 로 요구하는 컬럼 집합이 shared {@link DatasetKey#readerRequiredFields()} 와 같은지 고정한다.
 * 배치의 행 검증은 그 집합을 포함해야 하므로(배치 DatasetTest), 세 곳이 어긋나면 어느 한 테스트가 깨진다.
 * 방법: 필수 집합의 컬럼을 하나씩 빼 보면 반드시 실패하고, 집합 밖 컬럼을 빼도 실패하지 않아야 한다.
 */
class FactMapperContractTest {

    @Test
    void footTrafficMapperRequiresExactlyTheSharedContract() {
        assertContract(DatasetKey.FOOT_TRAFFIC_COMMERCIAL, footTrafficRow(),
            row -> FootTrafficCommercialFactMapper.toDomain(fact(row), "20241"));
    }

    @Test
    void changeMapperRequiresExactlyTheSharedContract() {
        assertContract(DatasetKey.CHANGE_COMMERCIAL, changeRow(),
            row -> ChangeCommercialFactMapper.toDomain(fact(row), "20241"));
    }

    private static void assertContract(DatasetKey key, Map<String, String> fullRow, Consumer<Map<String, String>> mapper) {
        mapper.accept(fullRow);  // 완전한 행은 통과한다
        for (String required : key.readerRequiredFields()) {
            Map<String, String> row = new HashMap<>(fullRow);
            row.remove(required);
            assertThatThrownBy(() -> mapper.accept(row)).as("%s without %s", key, required).isInstanceOf(DatasetException.class);
        }
        for (String column : fullRow.keySet()) {
            if (key.readerRequiredFields().contains(column) || column.equals("STDR_YYQU_CD")) {
                continue;
            }
            Map<String, String> row = new HashMap<>(fullRow);
            row.remove(column);
            assertThat(catchOrNull(() -> mapper.accept(row))).as("%s tolerates missing %s", key, column).isNull();
        }
    }

    private static Throwable catchOrNull(Runnable runnable) {
        try {
            runnable.run();
            return null;
        } catch (RuntimeException exception) {
            return exception;
        }
    }

    private static Map<String, String> footTrafficRow() {
        Map<String, String> row = identity();
        for (String metric : DatasetKey.FOOT_TRAFFIC_COMMERCIAL.readerRequiredFields()) {
            row.putIfAbsent(metric, "10");
        }
        return row;
    }

    private static Map<String, String> changeRow() {
        Map<String, String> row = identity();
        row.put("TRDAR_CHNGE_IX", "HH");
        row.put("TRDAR_CHNGE_IX_NM", "다이나믹");
        row.put("OPR_SALE_MT_AVRG", "108");
        row.put("CLS_SALE_MT_AVRG", "52");
        row.put("SU_OPR_SALE_MT_AVRG", "115");
        return row;
    }

    private static Map<String, String> identity() {
        Map<String, String> row = new HashMap<>();
        row.put("STDR_YYQU_CD", "20241");
        row.put("TRDAR_SE_CD", "A");
        row.put("TRDAR_SE_CD_NM", "골목상권");
        row.put("TRDAR_CD", "3110008");
        row.put("TRDAR_CD_NM", "배화여자대학교");
        return row;
    }

    private static DatasetFactEntity fact(Map<String, String> row) {
        return DatasetFactEntity.builder().id(new DatasetFactId("run-20241", "3110008", DatasetFactId.NO_SERVICE)).payload(row).build();
    }
}
