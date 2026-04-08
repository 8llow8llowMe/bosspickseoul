package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.client.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
@RequiredArgsConstructor
public class InternalApiResponseReader {

    private final ObjectMapper objectMapper;

    public <T> T getDataBodyAs(WebClient webClient, Duration readTimeout, String uriTemplate, Class<T> responseType, Object... uriVariables) {
        return objectMapper.convertValue(getDataBody(webClient, readTimeout, uriTemplate, uriVariables), responseType);
    }

    public <T> T getDataBodyAs(
        WebClient webClient,
        Duration readTimeout,
        String uriTemplate,
        TypeReference<T> typeReference,
        Object... uriVariables
    ) {
        return objectMapper.convertValue(getDataBody(webClient, readTimeout, uriTemplate, uriVariables), typeReference);
    }

    private JsonNode getDataBody(WebClient webClient, Duration readTimeout, String uriTemplate, Object... uriVariables) {
        try {
            JsonNode response = webClient.get().uri(uriTemplate, uriVariables).retrieve().bodyToMono(JsonNode.class).block(readTimeout);
            if (response == null || !response.path("dataHeader").path("success").asBoolean(false)) {
                throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
            }

            JsonNode dataBody = response.path("dataBody");
            if (dataBody.isMissingNode() || dataBody.isNull()) {
                throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE);
            }
            return dataBody;
        } catch (WebClientResponseException exception) {
            throw new AiReportException(AiReportErrorCode.SOURCE_DATA_UNAVAILABLE, exception);
        }
    }
}