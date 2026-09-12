package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.dto.openai.OpenAiSchemaMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.AiGenerationResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.model.CommercialAiSourceData;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.parser.AiStructuredResponseParser;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.service.prompt.AiReportPromptTemplate;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiUsageMeta;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiDraft;
import com.followfollowme.bosspickseoul.global.properties.AiLlmProperties;
import com.followfollowme.bosspickseoul.global.properties.AiLlmProvider;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.json.Jackson2JsonDecoder;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * OpenAI 호환 응답의 {@code usage} 블록이 사용량 집계값으로 이어지는지 고정한다.
 *
 * <p>{@code OpenAiUsage} 는 snake_case 필드를 {@code @JsonProperty} 로만 잇는다. 이름이 어긋나도 예외가 나지 않고
 * 값이 조용히 null 이 되어 사용량이 다시 0 으로 집계된다(남는 흔적은 WARN 로그뿐). 그래서 매핑 자체를
 * 실제 응답 모양의 JSON 리터럴로 검증한다 - 이 리터럴은 코드로 생성하지 않는다.
 *
 * <p>역직렬화는 {@code AiReportRedisGoldenJsonTest} 와 같은 이유로 부트 자동 구성 ObjectMapper 로 한다.
 * 직접 만든 ObjectMapper 로 고정하면 운영과 다른 구성을 검증하게 된다.
 */
@ExtendWith(MockitoExtension.class)
class OpenAiLlmClientAdapterUsageTest {

    private static final ObjectMapper OBJECT_MAPPER = autoConfiguredObjectMapper();

    private static final String MODEL_NAME = "gpt-4o-mini";

    private static final String RESPONSE_WITH_USAGE_JSON = """
        {
          "choices": [
            {
              "message": {
                "content": "{}"
              }
            }
          ],
          "usage": {
            "prompt_tokens": 11,
            "completion_tokens": 22,
            "total_tokens": 33
          }
        }
        """;

    private static final String RESPONSE_WITHOUT_USAGE_JSON = """
        {
          "choices": [
            {
              "message": {
                "content": "{}"
              }
            }
          ]
        }
        """;

    @Mock
    private OpenAiSchemaMapper schemaMapper;

    @Mock
    private AiStructuredResponseParser parser;

    @Mock
    private AiReportPromptTemplate promptTemplate;

    @Mock
    private CommercialAiSourceData sourceData;

    @Test
    @DisplayName("snake_case usage 가 그대로 사용량 집계값이 된다")
    void generateCommercialReport_responseWithUsage_mapsSnakeCaseTokenCounts() {
        AiGenerationResult<CommercialAiDraft> result = adapterRespondingWith(RESPONSE_WITH_USAGE_JSON).generateCommercialReport(sourceData);

        AiUsageMeta usage = result.usage();
        assertThat(usage.modelName()).isEqualTo(MODEL_NAME);
        assertThat(usage.promptTokens()).isEqualTo(11);
        assertThat(usage.completionTokens()).isEqualTo(22);
        assertThat(usage.totalTokens()).isEqualTo(33);
    }

    @Test
    @DisplayName("usage 를 주지 않는 게이트웨이 응답은 0 으로 집계된다")
    void generateCommercialReport_responseWithoutUsage_fallsBackToZero() {
        AiGenerationResult<CommercialAiDraft> result = adapterRespondingWith(RESPONSE_WITHOUT_USAGE_JSON).generateCommercialReport(sourceData);

        AiUsageMeta usage = result.usage();
        assertThat(usage.modelName()).isEqualTo(MODEL_NAME);
        assertThat(usage.promptTokens()).isZero();
        assertThat(usage.completionTokens()).isZero();
    }

    /**
     * 응답 본문만 갈아끼운 어댑터를 만든다. {@code exchangeFunction} 을 지정하면 어댑터가 거는 clientConnector 는
     * 무시되므로(DefaultWebClientBuilder) 네트워크 없이 어댑터의 실제 응답 처리 경로를 그대로 태울 수 있다.
     */
    private OpenAiLlmClientAdapter adapterRespondingWith(String responseJson) {
        return new OpenAiLlmClientAdapter(
            stubbedWebClientBuilder(responseJson), schemaMapper, parser, properties(),
            promptTemplate, CircuitBreakerRegistry.ofDefaults()
        );
    }

    private WebClient.Builder stubbedWebClientBuilder(String responseJson) {
        // 디코딩도 운영과 같은 ObjectMapper 로 한다. 기본 ExchangeStrategies 를 쓰면 별도 ObjectMapper 가 끼어든다.
        ExchangeStrategies strategies = ExchangeStrategies.builder()
            .codecs(configurer -> configurer.defaultCodecs().jackson2JsonDecoder(new Jackson2JsonDecoder(OBJECT_MAPPER)))
            .build();
        return WebClient.builder().exchangeFunction(request -> Mono.just(
            ClientResponse.create(HttpStatus.OK, strategies)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(responseJson)
                .build()
        ));
    }

    private AiLlmProperties properties() {
        return new AiLlmProperties(AiLlmProvider.OPENAI, "http://localhost:11434/v1", "test-api-key", MODEL_NAME, 1000L, 5000L, 1024, 0.2, null);
    }

    private static ObjectMapper autoConfiguredObjectMapper() {
        AtomicReference<ObjectMapper> holder = new AtomicReference<>();
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .run(context -> holder.set(context.getBean(ObjectMapper.class)));
        return holder.get();
    }
}
