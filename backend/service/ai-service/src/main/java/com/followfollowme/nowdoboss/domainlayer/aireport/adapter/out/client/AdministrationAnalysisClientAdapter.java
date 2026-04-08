package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support.InternalApiResponseReader;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AdministrationAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.nowdoboss.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class AdministrationAnalysisClientAdapter implements AdministrationAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;
    private final InternalApiResponseReader responseReader;

    public AdministrationAnalysisClientAdapter(
        WebClient.Builder webClientBuilder,
        InternalServiceClientProperties properties,
        InternalApiResponseReader responseReader
    ) {
        this.webClient = webClientBuilder.baseUrl(properties.commercialServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
        this.responseReader = responseReader;
    }

    @Override
    public AdministrationDetailQueryResult getAdministrationDetail(String administrationCode, String periodCode) {
        return responseReader.getDataBodyAs(
            webClient,
            readTimeout,
            "/api/v1/administrations/{administrationCode}?currentPeriodCode={periodCode}",
            AdministrationDetailQueryResult.class,
            administrationCode,
            periodCode
        );
    }
}