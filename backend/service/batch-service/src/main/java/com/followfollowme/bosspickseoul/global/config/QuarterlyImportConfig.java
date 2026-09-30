package com.followfollowme.bosspickseoul.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence.ChangeCommercialProjectionJdbcAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence.DatasetRefreshStateJdbcAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence.DatasetReleaseJdbcAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.persistence.ServiceCategoryJdbcAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source.SeoulDatasetSourceAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial.LegacySpatialJdbcSourceAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial.SpatialGeoJsonSourceAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial.SpatialReleaseJdbcAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSourceRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetRefreshStatePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.DatasetSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.ServiceCategoryLookupPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialReleasePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.SpatialSourcePort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.TypedFactProjectionPort;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRowProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.SpatialImportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.TypedFactProjectionProcessor;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * 분기 적재 포트·프로세서 조립. quarterly CLI 와 상시 컨테이너(자동 최신화) 가 같은 빈을 쓴다.
 *
 * <p>모든 DB 포트는 {@code commercialJdbcTemplate} 으로 간다. CLI 에서는 그것이 기본 DataSource(commercial)이고,
 * 상시 컨테이너에서는 {@code COMMERCIAL_DB_URL} 로 연 두 번째 풀이다. 상시 컨테이너의 기본 DataSource 는
 * district 라 무자격 주입에 기대지 않는다.
 *
 * <p>ObjectMapper 를 빈으로 올리지 않는다. {@code JacksonAutoConfiguration} 이 {@code @ConditionalOnMissingBean} 이라
 * 여기서 하나를 등록하면 상시 컨테이너의 웹·액추에이터가 쓰는 Boot 기본 ObjectMapper 가 사라진다. 분기 적재는
 * 설정 없는 {@code new ObjectMapper()} 로 페이로드와 fingerprint 를 만들어 왔으므로 그 인스턴스를 이 설정 안에 둔다.
 */
@Configuration
@EnableConfigurationProperties(DatasetSourceProperties.class)
public class QuarterlyImportConfig {

    private final ObjectMapper datasetObjectMapper = new ObjectMapper();

    @Bean
    public DatasetSourcePort datasetSourcePort(DatasetSourceProperties properties) {
        return new SeoulDatasetSourceAdapter(datasetObjectMapper, properties);
    }

    @Bean
    public DatasetReleasePort datasetReleasePort(@Qualifier("commercialJdbcTemplate") JdbcTemplate jdbc) {
        return new DatasetReleaseJdbcAdapter(jdbc, datasetObjectMapper);
    }

    /** 자동 최신화 상태. 기동 시 DB 를 건드리지 않으므로 테이블이 없는 환경에서도 빈은 뜬다. */
    @Bean
    public DatasetRefreshStatePort datasetRefreshStatePort(@Qualifier("commercialJdbcTemplate") JdbcTemplate jdbc) {
        return new DatasetRefreshStateJdbcAdapter(jdbc);
    }

    @Bean
    public SpatialSourcePort spatialSourcePort(DatasetSourceProperties properties, @Qualifier("commercialJdbcTemplate") JdbcTemplate jdbc) {
        SpatialSourcePort geoJson = new SpatialGeoJsonSourceAdapter(datasetObjectMapper, properties.getRawDirectory());
        SpatialSourcePort legacy = new LegacySpatialJdbcSourceAdapter(jdbc, datasetObjectMapper, properties.getLegacySpatialSchema());
        return request -> request.kind() == SpatialSourceRequest.Kind.LEGACY ? legacy.read(request) : geoJson.read(request);
    }

    @Bean
    public SpatialReleasePort spatialReleasePort(@Qualifier("commercialJdbcTemplate") JdbcTemplate jdbc,
                                                 @Qualifier("commercialTransactionManager") PlatformTransactionManager transactionManager) {
        return new SpatialReleaseJdbcAdapter(jdbc, transactionManager);
    }

    @Bean
    public SpatialImportProcessor spatialImportProcessor(SpatialSourcePort source, SpatialReleasePort releases) {
        return new SpatialImportProcessor(source, releases);
    }

    @Bean
    public DatasetRowProcessor datasetRowProcessor() {
        return new DatasetRowProcessor();
    }

    @Bean
    public TypedFactProjectionPort typedFactProjectionPort(@Qualifier("commercialJdbcTemplate") JdbcTemplate jdbc) {
        return new ChangeCommercialProjectionJdbcAdapter(jdbc, datasetObjectMapper);
    }

    @Bean
    public ServiceCategoryLookupPort serviceCategoryLookupPort(@Qualifier("commercialJdbcTemplate") JdbcTemplate jdbc) {
        return new ServiceCategoryJdbcAdapter(jdbc);
    }

    @Bean
    public TypedFactProjectionProcessor typedFactProjectionProcessor(
        TypedFactProjectionPort projections, ServiceCategoryLookupPort serviceCategories
    ) {
        return new TypedFactProjectionProcessor(projections, serviceCategories);
    }
}
