package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialAverageIncomeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialExpenseByCategoryClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFacilityClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFootTrafficByAgeGenderPercentClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFootTrafficByAgeGroupClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFootTrafficByDayOfWeekClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFootTrafficByTimeSlotClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialFootTrafficClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialIncomeAndExpenseClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialResidentPopulationByAgeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialResidentPopulationClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesByAgeGenderPercentClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesByAgeClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesByDayOfWeekClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesByTimeSlotClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesCountByDayOfWeekClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesCountByGenderClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesCountByTimeSlotClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSalesClientResponse;
import com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client.feign.dto.commercial.CommercialSchoolCountClientResponse;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * commercial-service 가 실제로 내려보내는 응답 JSON 과 {@code adapter/out/client/feign/dto/commercial} 의
 * wire DTO 사이의 역직렬화 계약을 고정하는 골든 테스트.
 *
 * <p><b>왜 필요한가.</b> 이 wire DTO 5종(+중첩 15종)은 {@code CommercialAnalysisClient} 의 Feign 반환 타입으로
 * 쓰이며, peer 응답을 그대로 역직렬화해 받는다. 최상위 타입에는 {@code @JsonProperty("...Item")} alias 가 붙어 있지만
 * 중첩 타입에는 alias 가 하나도 없고 <b>필드명이 우연히 peer 의 {@code *Item} DTO 와 같아서</b> 동작한다.
 * 이 계약을 참조하는 테스트가 없던 상태라, wire DTO 분리(이슈 #380) 과정에서 alias 를 잘못 옮기거나 필드를 빠뜨려도
 * 아무 테스트도 잡지 못했다. 그래서 리팩토링 <b>전에</b> 현재 계약을 못 박았고, 분리 후에는 역직렬화 대상 타입만
 * wire DTO 로 바꿔 같은 JSON 리터럴로 계속 지킨다. wire → QueryResult 변환 누락은
 * {@code CommercialAnalysisWireMapperTest} 가 따로 막는다.
 *
 * <p><b>리터럴은 코드로 생성하지 않는다.</b> 아래 JSON 은 commercial-service 의
 * {@code adapter/in/web/dto/response/Commercial*Response} 와 {@code adapter/in/web/dto/item/Commercial*Item} 의
 * 필드명에서 손으로 유도한 것이다. 빌더로 만들어 라운드트립하면 타입을 통째로 바꿔도 양쪽이 함께 바뀌어 무조건 통과한다.
 * 값도 필드마다 전부 다르게 넣었다. 같은 값이면 매핑이 뒤바뀌어도 통과하기 때문이다.
 *
 * <p><b>실패하면 리터럴을 고쳐서 통과시키지 마라.</b> 이 테스트가 깨지는 순간이 곧 "peer 응답을 더 이상 못 읽는 순간"이다.
 * 필드가 조용히 {@code 0}/{@code null} 이 되어 LLM 프롬프트에 잘못된 근거가 들어간다. peer DTO 가 실제로 바뀐 것인지
 * 먼저 확인해야 한다.
 */
class CommercialAnalysisWireGoldenJsonTest {

    /*
     * Feign 디코딩 경로와 동일한 ObjectMapper 를 쓴다.
     *
     * ai-service 에는 feign.codec.Decoder 빈 재정의도, ObjectMapper 빈 재정의도, spring.jackson.* 설정도 없다
     * (application.yml / -local / -dev / -prod 모두 spring.cloud.openfeign.client.config 의 타임아웃만 둔다).
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

    // GET /api/v1/commercials/{commercialCode}/services/{serviceCode}/sales -> Response<CommercialSalesResponse>
    private static final String SALES_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "amountByTimeSlotItem": {
              "salesAmountTime00To06": 1101,
              "salesAmountTime06To11": 1102,
              "salesAmountTime11To14": 1103,
              "salesAmountTime14To17": 1104,
              "salesAmountTime17To21": 1105,
              "salesAmountTime21To24": 1106
            },
            "amountByDayOfWeekItem": {
              "mondaySalesAmount": 1201,
              "tuesdaySalesAmount": 1202,
              "wednesdaySalesAmount": 1203,
              "thursdaySalesAmount": 1204,
              "fridaySalesAmount": 1205,
              "saturdaySalesAmount": 1206,
              "sundaySalesAmount": 1207
            },
            "amountByAgeItem": {
              "age10SalesAmount": 1301,
              "age20SalesAmount": 1302,
              "age30SalesAmount": 1303,
              "age40SalesAmount": 1304,
              "age50SalesAmount": 1305,
              "age60PlusSalesAmount": 1306
            },
            "amountByAgeGenderPercentItem": {
              "maleAge10Percent": 1.1,
              "femaleAge10Percent": 2.2,
              "maleAge20Percent": 3.3,
              "femaleAge20Percent": 4.4,
              "maleAge30Percent": 5.5,
              "femaleAge30Percent": 6.6,
              "maleAge40Percent": 7.7,
              "femaleAge40Percent": 8.8,
              "maleAge50Percent": 9.9,
              "femaleAge50Percent": 10.25,
              "maleAge60PlusPercent": 11.375,
              "femaleAge60PlusPercent": 12.5
            },
            "countByDayOfWeekItem": {
              "mondaySalesCount": 1501,
              "tuesdaySalesCount": 1502,
              "wednesdaySalesCount": 1503,
              "thursdaySalesCount": 1504,
              "fridaySalesCount": 1505,
              "saturdaySalesCount": 1506,
              "sundaySalesCount": 1507
            },
            "countByTimeSlotItem": {
              "salesCountTime00To06": 1601,
              "salesCountTime06To11": 1602,
              "salesCountTime11To14": 1603,
              "salesCountTime14To17": 1604,
              "salesCountTime17To21": 1605,
              "salesCountTime21To24": 1606
            },
            "countByGenderItem": {
              "maleSalesCount": 1701,
              "femaleSalesCount": 1702
            }
          }
        }
        """;

    // GET /api/v1/commercials/{commercialCode}/foot-traffic -> Response<CommercialFootTrafficResponse>
    private static final String FOOT_TRAFFIC_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "byTimeSlotItem": {
              "footTrafficTime00To06": 2101,
              "footTrafficTime06To11": 2102,
              "footTrafficTime11To14": 2103,
              "footTrafficTime14To17": 2104,
              "footTrafficTime17To21": 2105,
              "footTrafficTime21To24": 2106
            },
            "byDayOfWeekItem": {
              "mondayFootTraffic": 2201,
              "tuesdayFootTraffic": 2202,
              "wednesdayFootTraffic": 2203,
              "thursdayFootTraffic": 2204,
              "fridayFootTraffic": 2205,
              "saturdayFootTraffic": 2206,
              "sundayFootTraffic": 2207
            },
            "byAgeGroupItem": {
              "age10FootTraffic": 2301,
              "age20FootTraffic": 2302,
              "age30FootTraffic": 2303,
              "age40FootTraffic": 2304,
              "age50FootTraffic": 2305,
              "age60PlusFootTraffic": 2306
            },
            "byAgeGenderPercentItem": {
              "maleAge10Percent": 21.125,
              "femaleAge10Percent": 22.25,
              "maleAge20Percent": 23.375,
              "femaleAge20Percent": 24.5,
              "maleAge30Percent": 25.625,
              "femaleAge30Percent": 26.75,
              "maleAge40Percent": 27.875,
              "femaleAge40Percent": 28.0,
              "maleAge50Percent": 29.125,
              "femaleAge50Percent": 30.25,
              "maleAge60PlusPercent": 31.375,
              "femaleAge60PlusPercent": 32.5
            }
          }
        }
        """;

    // GET /api/v1/commercials/{commercialCode}/income -> Response<CommercialIncomeAndExpenseResponse>
    private static final String INCOME_AND_EXPENSE_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "averageIncomeItem": {
              "monthlyAverageIncomeAmount": 3101,
              "incomeBracketCode": 7
            },
            "expenseByCategoryItem": {
              "groceryExpenseAmount": 3201,
              "clothingExpenseAmount": 3202,
              "medicalExpenseAmount": 3203,
              "householdExpenseAmount": 3204,
              "transportationExpenseAmount": 3205,
              "leisureExpenseAmount": 3206,
              "cultureExpenseAmount": 3207,
              "educationExpenseAmount": 3208,
              "entertainmentExpenseAmount": 3209
            }
          }
        }
        """;

    // GET /api/v1/commercials/{commercialCode}/facilities -> Response<CommercialFacilityResponse>
    private static final String FACILITY_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "totalFacilityCount": 4101,
            "schoolCountItem": {
              "elementarySchoolCount": 4201,
              "middleSchoolCount": 4202,
              "highSchoolCount": 4203,
              "universityCount": 4204,
              "totalSchoolCount": 4205
            },
            "totalTransportationFacilityCount": 4301
          }
        }
        """;

    /*
     * GET /api/v1/commercials/{commercialCode}/population -> Response<CommercialResidentPopulationResponse>
     *
     * peer 의 CommercialResidentPopulationResponse 는 (byAgeItem, malePercentage, femalePercentage) 3개뿐이다.
     * totalResidentPopulationCount 라는 필드는 peer 에 존재하지 않는다 — 아래 리터럴에 없는 것이 의도된 것이며
     * 지금 운영에서 내려오는 모양 그대로다.
     */
    private static final String RESIDENT_POPULATION_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "byAgeItem": {
              "totalResidentPopulation": 5101,
              "age10ResidentPopulation": 5102,
              "age20ResidentPopulation": 5103,
              "age30ResidentPopulation": 5104,
              "age40ResidentPopulation": 5105,
              "age50ResidentPopulation": 5106,
              "age60PlusResidentPopulation": 5107
            },
            "malePercentage": 48.25,
            "femalePercentage": 51.75
          }
        }
        """;

    @Test
    @DisplayName("매출 응답 JSON 이 CommercialSalesClientResponse 와 중첩 7종의 모든 필드로 매핑된다")
    void salesGoldenJsonBindsEveryField() throws Exception {
        Response<CommercialSalesClientResponse> response = objectMapper.readValue(SALES_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        CommercialSalesClientResponse sales = response.dataBody();

        // @JsonProperty("amountByTimeSlotItem") -> amountByTimeSlot
        CommercialSalesByTimeSlotClientResponse amountByTimeSlot = sales.amountByTimeSlot();
        assertThat(amountByTimeSlot).isNotNull();
        assertThat(amountByTimeSlot.salesAmountTime00To06()).isEqualTo(1101L);
        assertThat(amountByTimeSlot.salesAmountTime06To11()).isEqualTo(1102L);
        assertThat(amountByTimeSlot.salesAmountTime11To14()).isEqualTo(1103L);
        assertThat(amountByTimeSlot.salesAmountTime14To17()).isEqualTo(1104L);
        assertThat(amountByTimeSlot.salesAmountTime17To21()).isEqualTo(1105L);
        assertThat(amountByTimeSlot.salesAmountTime21To24()).isEqualTo(1106L);

        // @JsonProperty("amountByDayOfWeekItem") -> amountByDayOfWeek
        CommercialSalesByDayOfWeekClientResponse amountByDayOfWeek = sales.amountByDayOfWeek();
        assertThat(amountByDayOfWeek).isNotNull();
        assertThat(amountByDayOfWeek.mondaySalesAmount()).isEqualTo(1201L);
        assertThat(amountByDayOfWeek.tuesdaySalesAmount()).isEqualTo(1202L);
        assertThat(amountByDayOfWeek.wednesdaySalesAmount()).isEqualTo(1203L);
        assertThat(amountByDayOfWeek.thursdaySalesAmount()).isEqualTo(1204L);
        assertThat(amountByDayOfWeek.fridaySalesAmount()).isEqualTo(1205L);
        assertThat(amountByDayOfWeek.saturdaySalesAmount()).isEqualTo(1206L);
        assertThat(amountByDayOfWeek.sundaySalesAmount()).isEqualTo(1207L);

        // @JsonProperty("amountByAgeItem") -> amountByAge
        CommercialSalesByAgeClientResponse amountByAge = sales.amountByAge();
        assertThat(amountByAge).isNotNull();
        assertThat(amountByAge.age10SalesAmount()).isEqualTo(1301L);
        assertThat(amountByAge.age20SalesAmount()).isEqualTo(1302L);
        assertThat(amountByAge.age30SalesAmount()).isEqualTo(1303L);
        assertThat(amountByAge.age40SalesAmount()).isEqualTo(1304L);
        assertThat(amountByAge.age50SalesAmount()).isEqualTo(1305L);
        assertThat(amountByAge.age60PlusSalesAmount()).isEqualTo(1306L);

        // @JsonProperty("amountByAgeGenderPercentItem") -> amountByAgeGenderPercent
        CommercialSalesByAgeGenderPercentClientResponse amountByAgeGenderPercent = sales.amountByAgeGenderPercent();
        assertThat(amountByAgeGenderPercent).isNotNull();
        assertThat(amountByAgeGenderPercent.maleAge10Percent()).isEqualTo(1.1);
        assertThat(amountByAgeGenderPercent.femaleAge10Percent()).isEqualTo(2.2);
        assertThat(amountByAgeGenderPercent.maleAge20Percent()).isEqualTo(3.3);
        assertThat(amountByAgeGenderPercent.femaleAge20Percent()).isEqualTo(4.4);
        assertThat(amountByAgeGenderPercent.maleAge30Percent()).isEqualTo(5.5);
        assertThat(amountByAgeGenderPercent.femaleAge30Percent()).isEqualTo(6.6);
        assertThat(amountByAgeGenderPercent.maleAge40Percent()).isEqualTo(7.7);
        assertThat(amountByAgeGenderPercent.femaleAge40Percent()).isEqualTo(8.8);
        assertThat(amountByAgeGenderPercent.maleAge50Percent()).isEqualTo(9.9);
        assertThat(amountByAgeGenderPercent.femaleAge50Percent()).isEqualTo(10.25);
        assertThat(amountByAgeGenderPercent.maleAge60PlusPercent()).isEqualTo(11.375);
        assertThat(amountByAgeGenderPercent.femaleAge60PlusPercent()).isEqualTo(12.5);

        // @JsonProperty("countByDayOfWeekItem") -> countByDayOfWeek
        CommercialSalesCountByDayOfWeekClientResponse countByDayOfWeek = sales.countByDayOfWeek();
        assertThat(countByDayOfWeek).isNotNull();
        assertThat(countByDayOfWeek.mondaySalesCount()).isEqualTo(1501L);
        assertThat(countByDayOfWeek.tuesdaySalesCount()).isEqualTo(1502L);
        assertThat(countByDayOfWeek.wednesdaySalesCount()).isEqualTo(1503L);
        assertThat(countByDayOfWeek.thursdaySalesCount()).isEqualTo(1504L);
        assertThat(countByDayOfWeek.fridaySalesCount()).isEqualTo(1505L);
        assertThat(countByDayOfWeek.saturdaySalesCount()).isEqualTo(1506L);
        assertThat(countByDayOfWeek.sundaySalesCount()).isEqualTo(1507L);

        // @JsonProperty("countByTimeSlotItem") -> countByTimeSlot
        CommercialSalesCountByTimeSlotClientResponse countByTimeSlot = sales.countByTimeSlot();
        assertThat(countByTimeSlot).isNotNull();
        assertThat(countByTimeSlot.salesCountTime00To06()).isEqualTo(1601L);
        assertThat(countByTimeSlot.salesCountTime06To11()).isEqualTo(1602L);
        assertThat(countByTimeSlot.salesCountTime11To14()).isEqualTo(1603L);
        assertThat(countByTimeSlot.salesCountTime14To17()).isEqualTo(1604L);
        assertThat(countByTimeSlot.salesCountTime17To21()).isEqualTo(1605L);
        assertThat(countByTimeSlot.salesCountTime21To24()).isEqualTo(1606L);

        // @JsonProperty("countByGenderItem") -> countByGender
        CommercialSalesCountByGenderClientResponse countByGender = sales.countByGender();
        assertThat(countByGender).isNotNull();
        assertThat(countByGender.maleSalesCount()).isEqualTo(1701L);
        assertThat(countByGender.femaleSalesCount()).isEqualTo(1702L);
    }

    @Test
    @DisplayName("유동인구 응답 JSON 이 CommercialFootTrafficClientResponse 와 중첩 4종의 모든 필드로 매핑된다")
    void footTrafficGoldenJsonBindsEveryField() throws Exception {
        Response<CommercialFootTrafficClientResponse> response = objectMapper.readValue(FOOT_TRAFFIC_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        CommercialFootTrafficClientResponse footTraffic = response.dataBody();

        // @JsonProperty("byTimeSlotItem") -> byTimeSlot
        CommercialFootTrafficByTimeSlotClientResponse byTimeSlot = footTraffic.byTimeSlot();
        assertThat(byTimeSlot).isNotNull();
        assertThat(byTimeSlot.footTrafficTime00To06()).isEqualTo(2101L);
        assertThat(byTimeSlot.footTrafficTime06To11()).isEqualTo(2102L);
        assertThat(byTimeSlot.footTrafficTime11To14()).isEqualTo(2103L);
        assertThat(byTimeSlot.footTrafficTime14To17()).isEqualTo(2104L);
        assertThat(byTimeSlot.footTrafficTime17To21()).isEqualTo(2105L);
        assertThat(byTimeSlot.footTrafficTime21To24()).isEqualTo(2106L);

        // @JsonProperty("byDayOfWeekItem") -> byDayOfWeek
        CommercialFootTrafficByDayOfWeekClientResponse byDayOfWeek = footTraffic.byDayOfWeek();
        assertThat(byDayOfWeek).isNotNull();
        assertThat(byDayOfWeek.mondayFootTraffic()).isEqualTo(2201L);
        assertThat(byDayOfWeek.tuesdayFootTraffic()).isEqualTo(2202L);
        assertThat(byDayOfWeek.wednesdayFootTraffic()).isEqualTo(2203L);
        assertThat(byDayOfWeek.thursdayFootTraffic()).isEqualTo(2204L);
        assertThat(byDayOfWeek.fridayFootTraffic()).isEqualTo(2205L);
        assertThat(byDayOfWeek.saturdayFootTraffic()).isEqualTo(2206L);
        assertThat(byDayOfWeek.sundayFootTraffic()).isEqualTo(2207L);

        // @JsonProperty("byAgeGroupItem") -> byAgeGroup
        CommercialFootTrafficByAgeGroupClientResponse byAgeGroup = footTraffic.byAgeGroup();
        assertThat(byAgeGroup).isNotNull();
        assertThat(byAgeGroup.age10FootTraffic()).isEqualTo(2301L);
        assertThat(byAgeGroup.age20FootTraffic()).isEqualTo(2302L);
        assertThat(byAgeGroup.age30FootTraffic()).isEqualTo(2303L);
        assertThat(byAgeGroup.age40FootTraffic()).isEqualTo(2304L);
        assertThat(byAgeGroup.age50FootTraffic()).isEqualTo(2305L);
        assertThat(byAgeGroup.age60PlusFootTraffic()).isEqualTo(2306L);

        // @JsonProperty("byAgeGenderPercentItem") -> byAgeGenderPercent
        CommercialFootTrafficByAgeGenderPercentClientResponse byAgeGenderPercent = footTraffic.byAgeGenderPercent();
        assertThat(byAgeGenderPercent).isNotNull();
        assertThat(byAgeGenderPercent.maleAge10Percent()).isEqualTo(21.125);
        assertThat(byAgeGenderPercent.femaleAge10Percent()).isEqualTo(22.25);
        assertThat(byAgeGenderPercent.maleAge20Percent()).isEqualTo(23.375);
        assertThat(byAgeGenderPercent.femaleAge20Percent()).isEqualTo(24.5);
        assertThat(byAgeGenderPercent.maleAge30Percent()).isEqualTo(25.625);
        assertThat(byAgeGenderPercent.femaleAge30Percent()).isEqualTo(26.75);
        assertThat(byAgeGenderPercent.maleAge40Percent()).isEqualTo(27.875);
        assertThat(byAgeGenderPercent.femaleAge40Percent()).isEqualTo(28.0);
        assertThat(byAgeGenderPercent.maleAge50Percent()).isEqualTo(29.125);
        assertThat(byAgeGenderPercent.femaleAge50Percent()).isEqualTo(30.25);
        assertThat(byAgeGenderPercent.maleAge60PlusPercent()).isEqualTo(31.375);
        assertThat(byAgeGenderPercent.femaleAge60PlusPercent()).isEqualTo(32.5);
    }

    @Test
    @DisplayName("소득·지출 응답 JSON 이 CommercialIncomeAndExpenseClientResponse 와 중첩 2종의 모든 필드로 매핑된다")
    void incomeAndExpenseGoldenJsonBindsEveryField() throws Exception {
        Response<CommercialIncomeAndExpenseClientResponse> response =
            objectMapper.readValue(INCOME_AND_EXPENSE_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        CommercialIncomeAndExpenseClientResponse incomeAndExpense = response.dataBody();

        // @JsonProperty("averageIncomeItem") -> averageIncome
        CommercialAverageIncomeClientResponse averageIncome = incomeAndExpense.averageIncome();
        assertThat(averageIncome).isNotNull();
        assertThat(averageIncome.monthlyAverageIncomeAmount()).isEqualTo(3101L);
        assertThat(averageIncome.incomeBracketCode()).isEqualTo(7);

        // @JsonProperty("expenseByCategoryItem") -> expenseByCategory
        CommercialExpenseByCategoryClientResponse expenseByCategory = incomeAndExpense.expenseByCategory();
        assertThat(expenseByCategory).isNotNull();
        assertThat(expenseByCategory.groceryExpenseAmount()).isEqualTo(3201L);
        assertThat(expenseByCategory.clothingExpenseAmount()).isEqualTo(3202L);
        assertThat(expenseByCategory.medicalExpenseAmount()).isEqualTo(3203L);
        assertThat(expenseByCategory.householdExpenseAmount()).isEqualTo(3204L);
        assertThat(expenseByCategory.transportationExpenseAmount()).isEqualTo(3205L);
        assertThat(expenseByCategory.leisureExpenseAmount()).isEqualTo(3206L);
        assertThat(expenseByCategory.cultureExpenseAmount()).isEqualTo(3207L);
        assertThat(expenseByCategory.educationExpenseAmount()).isEqualTo(3208L);
        assertThat(expenseByCategory.entertainmentExpenseAmount()).isEqualTo(3209L);
    }

    @Test
    @DisplayName("집객시설 응답 JSON 이 CommercialFacilityClientResponse 와 중첩 1종의 모든 필드로 매핑된다")
    void facilityGoldenJsonBindsEveryField() throws Exception {
        Response<CommercialFacilityClientResponse> response = objectMapper.readValue(FACILITY_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        CommercialFacilityClientResponse facility = response.dataBody();

        // 이 둘은 alias 없이 peer 필드명과 같아서 매핑된다.
        assertThat(facility.totalFacilityCount()).isEqualTo(4101L);
        assertThat(facility.totalTransportationFacilityCount()).isEqualTo(4301L);

        // @JsonProperty("schoolCountItem") -> schoolCount
        CommercialSchoolCountClientResponse schoolCount = facility.schoolCount();
        assertThat(schoolCount).isNotNull();
        assertThat(schoolCount.elementarySchoolCount()).isEqualTo(4201L);
        assertThat(schoolCount.middleSchoolCount()).isEqualTo(4202L);
        assertThat(schoolCount.highSchoolCount()).isEqualTo(4203L);
        assertThat(schoolCount.universityCount()).isEqualTo(4204L);
        assertThat(schoolCount.totalSchoolCount()).isEqualTo(4205L);
    }

    @Test
    @DisplayName("상주인구 응답 JSON 이 중첩 1종의 모든 필드로 매핑되고, totalResidentPopulationCount 는 현재 0 으로 남는다")
    void residentPopulationGoldenJsonBindsNestedFieldsButLeavesTotalCountAtZero() throws Exception {
        Response<CommercialResidentPopulationClientResponse> response =
            objectMapper.readValue(RESIDENT_POPULATION_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        CommercialResidentPopulationClientResponse population = response.dataBody();

        // @JsonProperty("byAgeItem") -> byAge
        CommercialResidentPopulationByAgeClientResponse byAge = population.byAge();
        assertThat(byAge).isNotNull();
        assertThat(byAge.age10ResidentPopulation()).isEqualTo(5102L);
        assertThat(byAge.age20ResidentPopulation()).isEqualTo(5103L);
        assertThat(byAge.age30ResidentPopulation()).isEqualTo(5104L);
        assertThat(byAge.age40ResidentPopulation()).isEqualTo(5105L);
        assertThat(byAge.age50ResidentPopulation()).isEqualTo(5106L);
        assertThat(byAge.age60PlusResidentPopulation()).isEqualTo(5107L);

        // peer 는 총 상주인구를 byAgeItem.totalResidentPopulation 으로 제대로 내려준다.
        // 아래 결함을 고칠 때 쓸 소스가 실제로 존재한다는 사실을 여기서 못 박아 둔다.
        assertThat(byAge.totalResidentPopulation()).isEqualTo(5101L);

        /*
         * 알려진 결함 (다음 단계에서 고친다).
         *
         * CommercialResidentPopulationClientResponse.totalResidentPopulationCount 에 대응하는 필드가
         * peer 의 CommercialResidentPopulationResponse 에 아예 없다(byAgeItem / malePercentage / femalePercentage 뿐).
         * record 컴포넌트가 primitive long 이라 매칭에 실패해도 예외 없이 조용히 0 이 된다.
         *
         * 이 0 은 CommercialAnalysisWireMapper -> CommercialResidentPopulationQueryResult
         * -> AiReportProcessor -> CommercialAiSourceData -> CommercialPromptFormatter 를 거쳐 LLM 프롬프트로 들어간다.
         * 즉 지금 모든 상권 AI 리포트가 "총 상주인구 0"을 근거로 생성되고 있다.
         *
         * 지금은 현재 동작을 그대로 고정한다. 다음 커밋에서 위 byAge.totalResidentPopulation() 을 쓰도록 고치면
         * 이 assert 가 바뀌고, 그 변경이 의도된 것임이 diff 에서 드러난다.
         */
        assertThat(population.totalResidentPopulationCount()).isZero();
    }

    @Test
    @DisplayName("최상위 @JsonProperty alias 는 load-bearing 이다: record 컴포넌트 이름으로는 바인딩되지 않는다")
    void topLevelJsonPropertyAliasIsLoadBearing() throws Exception {
        // peer 가 보내는 키는 "...Item" 이다. record 컴포넌트 이름(amountByTimeSlot / byAgeItem 없는 byAge 등)으로는
        // 바인딩되지 않고 @JsonIgnoreProperties(ignoreUnknown = true) 때문에 예외도 없이 null 이 된다.
        // wire DTO 에서 alias 를 빠뜨리면 정확히 이 모양으로 조용히 깨진다.
        String componentNamedJson = """
            {
              "amountByTimeSlot": { "salesAmountTime00To06": 9001 },
              "countByGender": { "maleSalesCount": 9002 }
            }
            """;

        CommercialSalesClientResponse sales = objectMapper.readValue(componentNamedJson, CommercialSalesClientResponse.class);

        assertThat(sales.amountByTimeSlot()).isNull();
        assertThat(sales.countByGender()).isNull();

        String facilityComponentNamedJson = """
            { "totalFacilityCount": 9003, "schoolCount": { "totalSchoolCount": 9004 } }
            """;

        CommercialFacilityClientResponse facility = objectMapper.readValue(facilityComponentNamedJson, CommercialFacilityClientResponse.class);

        // alias 가 없는 totalFacilityCount 는 이름이 같아 바인딩되지만, alias 가 붙은 schoolCount 는 바인딩되지 않는다.
        assertThat(facility.totalFacilityCount()).isEqualTo(9003L);
        assertThat(facility.schoolCount()).isNull();
    }
}
