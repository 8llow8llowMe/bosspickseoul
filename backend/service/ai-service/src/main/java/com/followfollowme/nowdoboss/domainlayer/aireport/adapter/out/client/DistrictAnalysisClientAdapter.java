package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client;

import com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support.InternalApiResponseReader;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.DistrictAnalysisQueryPort;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import com.followfollowme.nowdoboss.global.properties.InternalServiceClientProperties;
import java.time.Duration;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class DistrictAnalysisClientAdapter implements DistrictAnalysisQueryPort {

    private final WebClient webClient;
    private final Duration readTimeout;
    private final InternalApiResponseReader responseReader;

    public DistrictAnalysisClientAdapter(
        WebClient.Builder webClientBuilder,
        InternalServiceClientProperties properties,
        InternalApiResponseReader responseReader
    ) {
        // 자치구 상세 분석 엔드포인트는 현재 commercial-service에서 제공한다.
        this.webClient = webClientBuilder.baseUrl(properties.commercialServiceBaseUrl())
            .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.readTimeout = Duration.ofMillis(properties.readTimeoutMs());
        this.responseReader = responseReader;
    }

    @Override
    public DistrictDetailQueryResult getDistrictDetail(String districtCode, String periodCode) {
        return responseReader.getDataBodyAs(
            webClient,
            readTimeout,
            "/api/v1/districts/{districtCode}?currentPeriodCode={periodCode}",
            DistrictDetailQueryResult.class,
            districtCode,
            periodCode
        );
    }
}