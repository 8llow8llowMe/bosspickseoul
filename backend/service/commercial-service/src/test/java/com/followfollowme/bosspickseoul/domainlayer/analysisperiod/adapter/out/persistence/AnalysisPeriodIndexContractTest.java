package com.followfollowme.bosspickseoul.domainlayer.analysisperiod.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.SalesAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.administration.adapter.out.persistence.entity.StoreAdministrationEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.SalesCommercialEntity;
import com.followfollowme.bosspickseoul.domainlayer.commercial.adapter.out.persistence.entity.StoreCommercialEntity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 카탈로그 질의용 {@code (period_code, spatial_version)} 인덱스를 엔티티와 런북이 같은 이름·컬럼으로 선언하는지 고정한다(이슈 #464).
 *
 * <p>prod 는 {@code ddl-auto: none} 이라 런북({@code scripts/migration/analysis-period-index.sql})이 인덱스를 만들고, dev 는 엔티티의
 * {@code @Index} 로 Hibernate 가 만든다. 이름이 어긋나면 dev 에서 같은 인덱스가 두 개 생기고, 컬럼 순서가 바뀌면 loose index scan 을 못 탄다.
 * 실제 DDL 이 성립하는지는 H2 슬라이스({@code AnalysisDatasetPeriodRepositoryQueryTest})가 스키마를 만들며 함께 본다.
 */
class AnalysisPeriodIndexContractTest {

    private static final Path RUNBOOK = Path.of("..", "..", "scripts", "migration", "analysis-period-index.sql");
    private static final List<Class<?>> LARGE_FACT_TABLES =
        List.of(StoreCommercialEntity.class, SalesCommercialEntity.class, StoreAdministrationEntity.class, SalesAdministrationEntity.class);

    @Test
    @DisplayName("큰 팩트 테이블 4종은 (periodCode, spatialVersion) 인덱스를 선언하고 런북이 같은 이름·컬럼으로 만든다")
    void entitiesAndRunbookDeclareTheSameIndex() throws IOException {
        String runbook = Files.readString(RUNBOOK, StandardCharsets.UTF_8);

        for (Class<?> entity : LARGE_FACT_TABLES) {
            Table table = entity.getAnnotation(Table.class);
            String indexName = "idx_" + table.name() + "_period_code_spatial_version";
            List<Index> matches = Arrays.stream(table.indexes()).filter(index -> index.name().equals(indexName)).toList();

            assertThat(matches).as("%s", entity.getSimpleName()).hasSize(1);
            assertThat(matches.getFirst().columnList().replace(" ", "")).isEqualTo("periodCode,spatialVersion");
            assertThat(indexName.length()).as("MySQL 식별자 길이 한계").isLessThanOrEqualTo(64);
            assertThat(runbook).contains("ALTER TABLE " + table.name() + " ADD INDEX " + indexName + " (period_code, spatial_version)");
        }
    }
}
