package com.followfollowme.bosspickseoul.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.port.out.*;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.DatasetRowProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.service.processor.SpatialImportProcessor;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.source.SeoulDatasetSourceAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial.LegacySpatialJdbcSourceAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial.SpatialGeoJsonSourceAdapter;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.application.model.SpatialSourceRequest;
import com.followfollowme.bosspickseoul.domainlayer.dataingestion.adapter.out.spatial.SpatialReleaseJdbcAdapter;
import com.followfollowme.bosspickseoul.global.properties.DatasetSourceProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@Profile("quarterly")
@EnableConfigurationProperties(DatasetSourceProperties.class)
public class QuarterlyImportConfig {
    @Bean public ObjectMapper datasetObjectMapper() { return new ObjectMapper(); }
    @Bean public DatasetSourcePort datasetSourcePort(ObjectMapper mapper, DatasetSourceProperties properties) {
        return new SeoulDatasetSourceAdapter(mapper, properties);
    }
    @Bean public SpatialSourcePort spatialSourcePort(ObjectMapper mapper, DatasetSourceProperties properties, JdbcTemplate jdbc) {
        SpatialSourcePort geoJson = new SpatialGeoJsonSourceAdapter(mapper, properties.getRawDirectory());
        SpatialSourcePort legacy = new LegacySpatialJdbcSourceAdapter(jdbc, mapper);
        return request -> request.kind() == SpatialSourceRequest.Kind.LEGACY ? legacy.read(request) : geoJson.read(request);
    }
    @Bean public SpatialReleasePort spatialReleasePort(JdbcTemplate jdbc, PlatformTransactionManager transactionManager) {
        return new SpatialReleaseJdbcAdapter(jdbc, transactionManager);
    }
    @Bean public SpatialImportProcessor spatialImportProcessor(SpatialSourcePort source, SpatialReleasePort releases) {
        return new SpatialImportProcessor(source, releases);
    }
    @Bean public DatasetRowProcessor datasetRowProcessor() { return new DatasetRowProcessor(); }
}

