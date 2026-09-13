package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationCommercialQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationDistrictQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationIncomeDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationSalesDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationSalesServiceTopQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationStoreDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.AdministrationStoreServiceTopQueryResult;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * peer 가 실제로 내려보내는 응답 JSON 과 Administration 계열 8종 사이의 역직렬화 계약을 고정하는 골든 테스트.
 *
 * <p><b>왜 필요한가.</b> 이 8종은 {@code AdministrationAnalysisClient}(commercial-service) 와
 * {@code RegionAnalysisClient}(district-service) 의 Feign 반환 타입 안에서 peer 응답을 그대로 역직렬화해 받는다.
 * {@code @JsonProperty} alias 는 하나도 없고 <b>필드명이 우연히 peer 의 응답 DTO 와 같아서</b> 동작한다.
 * 이 계약을 참조하는 테스트가 저장소에 없어서, peer 가 필드를 리네임하거나 wire DTO 분리(이슈 #389) 중에
 * 이름을 잘못 옮겨도 아무 테스트도 잡지 못한다. {@code @JsonIgnoreProperties(ignoreUnknown = true)} 때문에
 * 예외가 나지 않고 값이 조용히 {@code 0}/{@code null} 이 된다. 그래서 리팩토링 <b>전에</b> 현재 계약을 못 박는다.
 * 분리 후에는 역직렬화 대상 타입만 wire DTO 로 바꿔 같은 JSON 리터럴로 계속 지킨다.
 *
 * <p><b>리터럴은 코드로 생성하지 않는다.</b> 아래 JSON 은 peer 소스의 필드명에서 손으로 유도한 것이다.
 * commercial-service 의 {@code administration/adapter/in/web/dto/{response,item}} 과
 * district-service 의 {@code region/adapter/in/web/dto/response} 다. 빌더로 만들어 라운드트립하면 타입을 통째로
 * 바꿔도 양쪽이 함께 바뀌어 무조건 통과한다. 값도 필드마다 전부 다르게 넣었다. 같은 값이면 대입이 뒤바뀌어도 통과한다.
 *
 * <p><b>실패하면 리터럴을 고쳐서 통과시키지 마라.</b> 이 테스트가 깨지는 순간이 곧 "peer 응답을 더 이상 못 읽는 순간"이다.
 * 값이 조용히 {@code 0}/{@code null} 이 되어 LLM 프롬프트에 잘못된 근거가 들어간다. peer DTO 가 실제로 바뀐 것인지
 * 먼저 확인해야 한다.
 */
class AdministrationAnalysisWireGoldenJsonTest {

    /*
     * Feign 디코딩 경로와 동일한 ObjectMapper 를 쓴다.
     *
     * ai-service 에는 feign.codec.Decoder 빈 재정의도, ObjectMapper 빈 재정의도, spring.jackson.* 설정도 없다.
     * 따라서 Spring Cloud OpenFeign 기본 경로
     *   FeignClientsConfiguration#feignDecoder
     *     -> OptionalDecoder(ResponseEntityDecoder(SpringDecoder(HttpMessageConverters)))
     *     -> MappingJackson2HttpMessageConverter
     *     -> 컨텍스트의 ObjectMapper 빈 (JacksonAutoConfiguration)
     * 이 그대로 적용된다. 즉 JacksonAutoConfiguration 이 만든 매퍼가 곧 운영에서 Feign 이 쓰는 매퍼다.
     *
     * 주의: Jackson2ObjectMapperBuilder.json().build() 로 직접 만들면 Boot 의 커스터마이저가 빠져
     * FAIL_ON_UNKNOWN_PROPERTIES 등이 운영과 달라진다. 그 구성으로 골든을 고정하면 운영과 다른 계약을 지키게 된다.
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

    // commercial-service: GET /api/v1/administrations/{administrationCode} -> Response<AdministrationDetailResponse>
    private static final String DETAIL_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "administrationCode": "11680101",
            "administrationName": "역삼1동",
            "sales": {
              "topSalesServices": [
                {
                  "serviceCode": "CS100001",
                  "serviceName": "한식음식점",
                  "monthlySalesAmount": 1101,
                  "salesChangeRate": 1.1
                },
                {
                  "serviceCode": "CS100002",
                  "serviceName": "커피-음료",
                  "monthlySalesAmount": 1102,
                  "salesChangeRate": 2.2
                }
              ]
            },
            "store": {
              "topStoreServices": [
                {
                  "serviceCode": "CS200001",
                  "serviceName": "편의점",
                  "totalStoreCount": 2101,
                  "similarStoreCount": 2102,
                  "openedStoreCount": 2103,
                  "closedStoreCount": 2104,
                  "franchiseStoreCount": 2105,
                  "openingRate": 3.3,
                  "closureRate": 4.4
                },
                {
                  "serviceCode": "CS200002",
                  "serviceName": "일반의류",
                  "totalStoreCount": 2201,
                  "similarStoreCount": 2202,
                  "openedStoreCount": 2203,
                  "closedStoreCount": 2204,
                  "franchiseStoreCount": 2205,
                  "openingRate": 5.5,
                  "closureRate": 6.6
                }
              ]
            },
            "income": { "totalExpenseAmount": 3101 }
          }
        }
        """;

    // district-service: GET /api/v1/regions/administrations/{administrationCode}
    //   -> Response<AdministrationDistrictAreaResponse>
    private static final String ADMINISTRATION_DISTRICT_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "districtCode": "11680",
            "districtName": "강남구",
            "administrationCode": "11680101",
            "administrationName": "역삼1동"
          }
        }
        """;

    /*
     * district-service:
     *   GET /api/v1/regions/districts/{districtCode}/administrations/{administrationCode}/commercials
     *     -> Response<List<CommercialAreaResponse>>
     *
     * peer 는 항목마다 6개 필드를 내려보내는데 ai-service 는 그중 2개만 쓴다. 나머지 4개가
     * @JsonIgnoreProperties(ignoreUnknown = true) 로 조용히 버려지는 것까지가 현재 계약이므로 전문 그대로 넣는다.
     */
    private static final String ADMINISTRATION_COMMERCIALS_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": [
            {
              "commercialCode": "3110125",
              "commercialName": "강남역",
              "commercialClassificationCode": "A",
              "commercialClassificationName": "골목상권",
              "centerLat": 37.498095,
              "centerLng": 127.027610
            },
            {
              "commercialCode": "3110008",
              "commercialName": "역삼역",
              "commercialClassificationCode": "D",
              "commercialClassificationName": "발달상권",
              "centerLat": 37.500622,
              "centerLng": 127.036456
            }
          ]
        }
        """;

    @Test
    @DisplayName("행정동 상세 응답 JSON 이 상세·매출·점포·지출 5종의 모든 필드로 매핑된다")
    void detailGoldenJsonBindsEveryField() throws Exception {
        Response<AdministrationDetailQueryResult> response =
            objectMapper.readValue(DETAIL_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        AdministrationDetailQueryResult detail = response.dataBody();
        assertThat(detail.administrationCode()).isEqualTo("11680101");
        assertThat(detail.administrationName()).isEqualTo("역삼1동");

        AdministrationSalesDetailQueryResult sales = detail.sales();
        assertThat(sales).isNotNull();
        assertThat(sales.topSalesServices()).hasSize(2);

        AdministrationSalesServiceTopQueryResult firstSalesService = sales.topSalesServices().get(0);
        assertThat(firstSalesService.serviceCode()).isEqualTo("CS100001");
        assertThat(firstSalesService.serviceName()).isEqualTo("한식음식점");
        assertThat(firstSalesService.monthlySalesAmount()).isEqualTo(1101L);
        assertThat(firstSalesService.salesChangeRate()).isEqualTo(1.1);

        // 목록 순서가 뒤집히지 않는지까지 확인한다. 상위 업종은 순위가 곧 의미다.
        AdministrationSalesServiceTopQueryResult secondSalesService = sales.topSalesServices().get(1);
        assertThat(secondSalesService.serviceCode()).isEqualTo("CS100002");
        assertThat(secondSalesService.serviceName()).isEqualTo("커피-음료");
        assertThat(secondSalesService.monthlySalesAmount()).isEqualTo(1102L);
        assertThat(secondSalesService.salesChangeRate()).isEqualTo(2.2);

        AdministrationStoreDetailQueryResult store = detail.store();
        assertThat(store).isNotNull();
        assertThat(store.topStoreServices()).hasSize(2);

        AdministrationStoreServiceTopQueryResult firstStoreService = store.topStoreServices().get(0);
        assertThat(firstStoreService.serviceCode()).isEqualTo("CS200001");
        assertThat(firstStoreService.serviceName()).isEqualTo("편의점");
        assertThat(firstStoreService.totalStoreCount()).isEqualTo(2101L);
        assertThat(firstStoreService.similarStoreCount()).isEqualTo(2102L);
        assertThat(firstStoreService.openedStoreCount()).isEqualTo(2103L);
        assertThat(firstStoreService.closedStoreCount()).isEqualTo(2104L);
        assertThat(firstStoreService.franchiseStoreCount()).isEqualTo(2105L);
        assertThat(firstStoreService.openingRate()).isEqualTo(3.3);
        assertThat(firstStoreService.closureRate()).isEqualTo(4.4);

        AdministrationStoreServiceTopQueryResult secondStoreService = store.topStoreServices().get(1);
        assertThat(secondStoreService.serviceCode()).isEqualTo("CS200002");
        assertThat(secondStoreService.serviceName()).isEqualTo("일반의류");
        assertThat(secondStoreService.totalStoreCount()).isEqualTo(2201L);
        assertThat(secondStoreService.similarStoreCount()).isEqualTo(2202L);
        assertThat(secondStoreService.openedStoreCount()).isEqualTo(2203L);
        assertThat(secondStoreService.closedStoreCount()).isEqualTo(2204L);
        assertThat(secondStoreService.franchiseStoreCount()).isEqualTo(2205L);
        assertThat(secondStoreService.openingRate()).isEqualTo(5.5);
        assertThat(secondStoreService.closureRate()).isEqualTo(6.6);

        AdministrationIncomeDetailQueryResult income = detail.income();
        assertThat(income).isNotNull();
        assertThat(income.totalExpenseAmount()).isEqualTo(3101L);
    }

    @Test
    @DisplayName("행정동 상위 지역 응답 JSON 이 자치구·행정동 코드와 이름 4개로 매핑된다")
    void administrationDistrictGoldenJsonBindsEveryField() throws Exception {
        Response<AdministrationDistrictQueryResult> response =
            objectMapper.readValue(ADMINISTRATION_DISTRICT_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        AdministrationDistrictQueryResult district = response.dataBody();
        assertThat(district.districtCode()).isEqualTo("11680");
        assertThat(district.districtName()).isEqualTo("강남구");
        assertThat(district.administrationCode()).isEqualTo("11680101");
        assertThat(district.administrationName()).isEqualTo("역삼1동");
    }

    @Test
    @DisplayName("행정동 소속 상권 목록 응답 JSON 에서 코드·이름만 취하고 나머지 4개 필드는 버린다")
    void administrationCommercialsGoldenJsonBindsCodeAndNameOnly() throws Exception {
        Response<List<AdministrationCommercialQueryResult>> response =
            objectMapper.readValue(ADMINISTRATION_COMMERCIALS_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        List<AdministrationCommercialQueryResult> commercials = response.dataBody();
        assertThat(commercials).hasSize(2);

        assertThat(commercials.get(0).commercialCode()).isEqualTo("3110125");
        assertThat(commercials.get(0).commercialName()).isEqualTo("강남역");
        assertThat(commercials.get(1).commercialCode()).isEqualTo("3110008");
        assertThat(commercials.get(1).commercialName()).isEqualTo("역삼역");
    }
}
