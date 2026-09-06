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
    private Map<String, String> headerAliases = new LinkedHashMap<>(Map.of("기준_년분기_코드", "STDR_YYQU_CD"));
}
