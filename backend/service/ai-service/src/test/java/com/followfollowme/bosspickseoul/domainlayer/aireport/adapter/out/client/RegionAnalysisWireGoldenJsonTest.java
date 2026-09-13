package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.CommercialAdministrationQueryResult;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * district-service 가 실제로 내려보내는 상권 소속 지역 응답 JSON 과 {@code RegionAnalysisClient} 의 역직렬화 계약을
 * 고정하는 골든 테스트.
 *
 * <p><b>왜 필요한가.</b> {@code CommercialAdministrationQueryResult} 는 {@code application/port/out/query} 에
 * 있으면서 동시에 Feign 반환 타입을 겸하고 있다. {@code @JsonProperty} alias 는 하나도 없고
 * <b>컴포넌트 이름이 우연히 peer 의 {@code CommercialAdministrationAreaResponse} 와 같아서</b> 동작한다.
 * 이름이 어긋나면 {@code @JsonIgnoreProperties(ignoreUnknown = true)} 때문에 예외 없이 {@code null} 이 된다.
 * 이 계약을 참조하는 테스트가 없던 상태라, wire DTO 분리(이슈 #387)에서 필드를 빠뜨려도 아무 테스트도 잡지 못했다.
 * 그래서 리팩토링 <b>전에</b> 현재 계약을 못 박고, 분리 후에는 역직렬화 대상 타입만 wire DTO 로 바꿔
 * 같은 JSON 리터럴로 계속 지킨다. wire → QueryResult 변환 누락은 {@code RegionAnalysisWireMapperTest} 가 따로 막는다.
 *
 * <p><b>리터럴은 코드로 생성하지 않는다.</b> 아래 JSON 은 district-service 의
 * {@code adapter/in/web/dto/response/CommercialAdministrationAreaResponse} 의 필드명에서 손으로 유도한 것이다.
 * 값도 필드마다 전부 다르게 넣었다. 같은 값이면 매핑이 뒤바뀌어도 통과하기 때문이다.
 *
 * <p><b>실패하면 리터럴을 고쳐서 통과시키지 마라.</b> 이 테스트가 깨지는 순간이 곧 "peer 응답을 더 이상 못 읽는 순간"이다.
 * 상권명·자치구명·행정동명이 조용히 {@code null} 이 되어 LLM 프롬프트에 잘못된 근거가 들어간다.
 * peer DTO 가 실제로 바뀐 것인지 먼저 확인해야 한다.
 *
 * <p>{@code RegionAnalysisClient} 의 나머지 3개 메서드가 쓰는 QueryResult 는 별도 이슈(#388/#389) 소관이라
 * 여기서 다루지 않는다.
 */
class RegionAnalysisWireGoldenJsonTest {

    /*
     * Feign 디코딩 경로와 동일한 ObjectMapper 를 쓴다. 선정 근거(ai-service 에 Decoder/ObjectMapper/spring.jackson
     * 재정의가 없어 JacksonAutoConfiguration 이 만든 매퍼가 곧 Feign 이 쓰는 매퍼라는 확인 경로)는
     * CommercialAnalysisWireGoldenJsonTest 의 같은 자리 주석에 적어 두었다.
     *
     * 주의: Jackson2ObjectMapperBuilder.json().build() 로 직접 만들면 Boot 의 커스터마이저가 빠져
     * FAIL_ON_UNKNOWN_PROPERTIES 등이 운영과 달라진다.
     */
    private static final ObjectMapper OBJECT_MAPPER = autoConfiguredObjectMapper();

    private static ObjectMapper autoConfiguredObjectMapper() {
        AtomicReference<ObjectMapper> holder = new AtomicReference<>();
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .run(context -> holder.set(context.getBean(ObjectMapper.class)));
        return holder.get();
    }

    private final ObjectMapper objectMapper = OBJECT_MAPPER;

    // GET /api/v1/regions/commercials/{commercialCode}/administration -> Response<CommercialAdministrationAreaResponse>
    private static final String COMMERCIAL_ADMINISTRATION_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "commercialCode": "3110008",
            "commercialName": "경복궁역",
            "districtCode": "11110",
            "districtName": "종로구",
            "administrationCode": "11110515",
            "administrationName": "사직동"
          }
        }
        """;

    @Test
    @DisplayName("상권 소속 지역 응답 JSON 이 CommercialAdministrationQueryResult 의 모든 필드로 매핑된다")
    void commercialAdministrationGoldenJsonBindsEveryField() throws Exception {
        Response<CommercialAdministrationQueryResult> response =
            objectMapper.readValue(COMMERCIAL_ADMINISTRATION_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        CommercialAdministrationQueryResult administration = response.dataBody();

        assertThat(administration.commercialCode()).isEqualTo("3110008");
        assertThat(administration.commercialName()).isEqualTo("경복궁역");
        assertThat(administration.districtCode()).isEqualTo("11110");
        assertThat(administration.districtName()).isEqualTo("종로구");
        assertThat(administration.administrationCode()).isEqualTo("11110515");
        assertThat(administration.administrationName()).isEqualTo("사직동");
    }
}
