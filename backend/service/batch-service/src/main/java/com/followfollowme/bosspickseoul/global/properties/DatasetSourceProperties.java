package com.followfollowme.bosspickseoul.global.properties;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "batch.dataset-source")
public class DatasetSourceProperties {
    private String apiKey;
    private String baseUrl = "http://openapi.seoul.go.kr:8088";
    private Path rawDirectory = Path.of("data", "raw");
    private int timeoutSeconds = 30;
    private int maxAttempts = 3;
    /** Local additions to classpath {@code seoul/csv-header-aliases.csv}; normally empty. */
    private Map<String, String> headerAliases = new LinkedHashMap<>();
    /**
     * Schema holding the legacy {@code area_boundary} and {@code commercial_region_mapping} tables.
     * They live in the district service's schema, not the commercial one the facts are written to,
     * so a LEGACY spatial import must qualify them. Blank means the batch's own schema.
     */
    private String legacySpatialSchema = "";
}
