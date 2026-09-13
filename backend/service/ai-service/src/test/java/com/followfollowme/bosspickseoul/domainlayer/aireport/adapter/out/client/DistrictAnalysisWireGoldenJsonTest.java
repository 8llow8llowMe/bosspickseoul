package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.client;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.common.dto.Response;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAgeGroupFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictAreaQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictChangeIndicatorQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDayOfWeekFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictFootTrafficDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictGenderFootTrafficQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictSalesDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictStoreDetailQueryResult;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.query.DistrictTimeSlotFootTrafficQueryResult;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * District 계열 Feign 응답 JSON 과 역직렬화 대상 타입 사이의 계약을 고정하는 골든 테스트.
 *
 * <p><b>왜 필요한가.</b> District 계열 16종은 {@code DistrictAnalysisClient} / {@code RegionAnalysisClient} 의
 * Feign 반환 타입으로 쓰이는데, {@code @JsonProperty} alias 가 하나도 없고 <b>필드명이 peer 의 응답 DTO 와 같아서</b>
 * 동작한다. alias 가 없을 뿐 결합은 #380 이 Commercial 계열에서 끊은 것과 같은 종류다. 게다가
 * {@code @JsonIgnoreProperties(ignoreUnknown = true)} 때문에 이름이 어긋나도 예외가 나지 않고 조용히
 * {@code 0}/{@code null} 이 된다. 이 계약을 참조하는 테스트가 저장소에 하나도 없어서, wire DTO 로 분리하는 과정에서
 * 필드를 빠뜨리거나 구조를 어긋나게 옮겨도 아무것도 잡지 못한다.
 *
 * <p>그래서 분리 <b>전에</b> 현재 계약을 못 박는다. 분리 후에는 역직렬화 대상 타입만 wire DTO 로 바꿔 같은 JSON
 * 리터럴로 계속 지킨다. wire → QueryResult 변환 누락은 {@code DistrictAnalysisWireMapperTest} 가 따로 막는다.
 *
 * <p><b>리터럴은 코드로 생성하지 않는다.</b> 아래 JSON 은 commercial-service 의
 * {@code domainlayer/district/adapter/in/web/dto/response/*Response} 와 {@code .../dto/item/District*Item},
 * district-service 의 {@code domainlayer/region/adapter/in/web/dto/response/DistrictAreaResponse} 필드명에서
 * 손으로 유도한 것이다. 빌더로 만들어 라운드트립하면 타입을 통째로 바꿔도 양쪽이 함께 바뀌어 무조건 통과한다.
 * 값도 필드마다 전부 다르게 넣었다. 같은 값이면 대입이 뒤바뀌어도 통과하기 때문이다.
 *
 * <p><b>실패하면 리터럴을 고쳐서 통과시키지 마라.</b> 이 테스트가 깨지는 순간이 곧 "peer 응답을 더 이상 못 읽는 순간"
 * 이다. peer DTO 가 실제로 바뀐 것인지 먼저 확인해야 한다.
 */
class DistrictAnalysisWireGoldenJsonTest {

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

    // commercial-service: GET /api/v1/districts/{districtCode}?currentPeriodCode=... -> Response<DistrictDetailResponse>
    private static final String DISTRICT_DETAIL_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "changeIndicator": {
              "changeIndicatorCode": "CHANGE_CODE_1101",
              "changeIndicatorName": "변화지표이름1102",
              "averageOpenedMonths": 1103,
              "averageClosedMonths": 1104
            },
            "footTraffic": {
              "periodTrend": {
                "code": "TREND_CODE_2101",
                "name": "추이이름2102",
                "description": "추이설명2103"
              },
              "periodTotalFootTrafficList": [
                { "periodCode": "PERIOD_CODE_2201", "totalFootTraffic": 2202 },
                { "periodCode": "PERIOD_CODE_2203", "totalFootTraffic": 2204 }
              ],
              "timeSlot": {
                "footTrafficTime00To06": 2301,
                "footTrafficTime06To11": 2302,
                "footTrafficTime11To14": 2303,
                "footTrafficTime14To17": 2304,
                "footTrafficTime17To21": 2305,
                "footTrafficTime21To24": 2306,
                "dominantTimeSlotType": {
                  "code": "TIME_SLOT_CODE_2307",
                  "name": "시간대이름2308",
                  "description": "시간대설명2309"
                }
              },
              "gender": {
                "maleFootTraffic": 2401,
                "femaleFootTraffic": 2402,
                "dominantGenderType": {
                  "code": "GENDER_CODE_2403",
                  "name": "성별이름2404",
                  "description": "성별설명2405"
                }
              },
              "ageGroup": {
                "age10FootTraffic": 2501,
                "age20FootTraffic": 2502,
                "age30FootTraffic": 2503,
                "age40FootTraffic": 2504,
                "age50FootTraffic": 2505,
                "age60PlusFootTraffic": 2506,
                "dominantAgeGroupType": {
                  "code": "AGE_GROUP_CODE_2507",
                  "name": "연령대이름2508",
                  "description": "연령대설명2509"
                }
              },
              "dayOfWeek": {
                "mondayFootTraffic": 2601,
                "tuesdayFootTraffic": 2602,
                "wednesdayFootTraffic": 2603,
                "thursdayFootTraffic": 2604,
                "fridayFootTraffic": 2605,
                "saturdayFootTraffic": 2606,
                "sundayFootTraffic": 2607,
                "dominantDayOfWeekType": {
                  "code": "DAY_OF_WEEK_CODE_2608",
                  "name": "요일이름2609",
                  "description": "요일설명2610"
                }
              }
            },
            "store": {
              "topStoreServices": [
                { "serviceCode": "STORE_SERVICE_CODE_3101", "serviceName": "점포업종이름3102", "totalStoreCount": 3103 },
                { "serviceCode": "STORE_SERVICE_CODE_3104", "serviceName": "점포업종이름3105", "totalStoreCount": 3106 }
              ],
              "topOpenedAdministrations": [
                {
                  "administrationCode": "OPENED_ADMIN_CODE_3201",
                  "administrationName": "개업행정동이름3202",
                  "openedStoreCount": 3203,
                  "openingRate": 32.04
                },
                {
                  "administrationCode": "OPENED_ADMIN_CODE_3205",
                  "administrationName": "개업행정동이름3206",
                  "openedStoreCount": 3207,
                  "openingRate": 32.08
                }
              ],
              "topClosedAdministrations": [
                {
                  "administrationCode": "CLOSED_ADMIN_CODE_3301",
                  "administrationName": "폐업행정동이름3302",
                  "closedStoreCount": 3303,
                  "closureRate": 33.04
                },
                {
                  "administrationCode": "CLOSED_ADMIN_CODE_3305",
                  "administrationName": "폐업행정동이름3306",
                  "closedStoreCount": 3307,
                  "closureRate": 33.08
                }
              ]
            },
            "sales": {
              "topSalesServices": [
                { "serviceCode": "SALES_SERVICE_CODE_4101", "serviceName": "매출업종이름4102", "salesChangeRate": 41.03 },
                { "serviceCode": "SALES_SERVICE_CODE_4104", "serviceName": "매출업종이름4105", "salesChangeRate": 41.06 }
              ],
              "topSalesAdministrations": [
                {
                  "administrationCode": "SALES_ADMIN_CODE_4201",
                  "administrationName": "매출행정동이름4202",
                  "totalSalesAmount": 4203,
                  "salesChangeRate": 42.04
                },
                {
                  "administrationCode": "SALES_ADMIN_CODE_4205",
                  "administrationName": "매출행정동이름4206",
                  "totalSalesAmount": 4207,
                  "salesChangeRate": 42.08
                }
              ]
            }
          }
        }
        """;

    // district-service: GET /api/v1/regions/districts/{districtCode} -> Response<DistrictAreaResponse>
    private static final String DISTRICT_AREA_GOLDEN_JSON = """
        {
          "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
          "dataBody": {
            "districtCode": "DISTRICT_CODE_5101",
            "districtName": "자치구이름5102"
          }
        }
        """;

    @Test
    @DisplayName("자치구 상세 응답 JSON 이 최상위 4블록과 중첩 타입의 모든 필드로 매핑된다")
    void districtDetailGoldenJsonBindsEveryField() throws Exception {
        Response<DistrictDetailQueryResult> response =
            objectMapper.readValue(DISTRICT_DETAIL_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        DistrictDetailQueryResult detail = response.dataBody();
        assertThat(detail).isNotNull();

        assertChangeIndicator(detail.changeIndicator());
        assertFootTraffic(detail.footTraffic());
        assertStore(detail.store());
        assertSales(detail.sales());
    }

    @Test
    @DisplayName("자치구 지역 응답 JSON 이 DistrictAreaQueryResult 의 모든 필드로 매핑된다")
    void districtAreaGoldenJsonBindsEveryField() throws Exception {
        Response<DistrictAreaQueryResult> response =
            objectMapper.readValue(DISTRICT_AREA_GOLDEN_JSON, new TypeReference<>() {});

        assertThat(response.dataHeader().success()).isTrue();
        DistrictAreaQueryResult area = response.dataBody();
        assertThat(area).isNotNull();
        assertThat(area.districtCode()).isEqualTo("DISTRICT_CODE_5101");
        assertThat(area.districtName()).isEqualTo("자치구이름5102");
    }

    @Test
    @DisplayName("peer 가 필드를 리네임하면 예외 없이 0/null 이 된다 — 이름 일치가 load-bearing 이다")
    void renamedPeerFieldSilentlyBecomesZeroOrNull() throws Exception {
        // @JsonIgnoreProperties(ignoreUnknown = true) 라서 모르는 키는 조용히 버려지고 대상 필드는 기본값으로 남는다.
        // alias 가 없는 District 계열은 "필드명이 peer 와 같다" 는 사실 하나에 전부 걸려 있다.
        String renamedJson = """
            {
              "dataHeader": { "success": true, "resultCode": null, "resultMessage": null },
              "dataBody": {
                "changeIndicatorCd": "CHANGE_CODE_9101",
                "changeIndicatorName": "변화지표이름9102",
                "avgOpenedMonths": 9103,
                "averageClosedMonths": 9104
              }
            }
            """;

        Response<DistrictChangeIndicatorQueryResult> response =
            objectMapper.readValue(renamedJson, new TypeReference<>() {});

        DistrictChangeIndicatorQueryResult changeIndicator = response.dataBody();
        assertThat(changeIndicator.changeIndicatorCode()).isNull();
        assertThat(changeIndicator.averageOpenedMonths()).isZero();
        // 이름이 그대로인 필드만 살아남는다. 절반이 비어도 예외는 나지 않는다.
        assertThat(changeIndicator.changeIndicatorName()).isEqualTo("변화지표이름9102");
        assertThat(changeIndicator.averageClosedMonths()).isEqualTo(9104);
    }

    private static void assertChangeIndicator(DistrictChangeIndicatorQueryResult changeIndicator) {
        assertThat(changeIndicator).isNotNull();
        assertThat(changeIndicator.changeIndicatorCode()).isEqualTo("CHANGE_CODE_1101");
        assertThat(changeIndicator.changeIndicatorName()).isEqualTo("변화지표이름1102");
        assertThat(changeIndicator.averageOpenedMonths()).isEqualTo(1103);
        assertThat(changeIndicator.averageClosedMonths()).isEqualTo(1104);
    }

    private static void assertFootTraffic(DistrictFootTrafficDetailQueryResult footTraffic) {
        assertThat(footTraffic).isNotNull();

        assertThat(footTraffic.periodTrend()).isNotNull();
        assertThat(footTraffic.periodTrend().code()).isEqualTo("TREND_CODE_2101");
        assertThat(footTraffic.periodTrend().name()).isEqualTo("추이이름2102");
        assertThat(footTraffic.periodTrend().description()).isEqualTo("추이설명2103");

        assertThat(footTraffic.periodTotalFootTrafficList()).hasSize(2);
        assertThat(footTraffic.periodTotalFootTrafficList().get(0).periodCode()).isEqualTo("PERIOD_CODE_2201");
        assertThat(footTraffic.periodTotalFootTrafficList().get(0).totalFootTraffic()).isEqualTo(2202L);
        assertThat(footTraffic.periodTotalFootTrafficList().get(1).periodCode()).isEqualTo("PERIOD_CODE_2203");
        assertThat(footTraffic.periodTotalFootTrafficList().get(1).totalFootTraffic()).isEqualTo(2204L);

        DistrictTimeSlotFootTrafficQueryResult timeSlot = footTraffic.timeSlot();
        assertThat(timeSlot).isNotNull();
        assertThat(timeSlot.footTrafficTime00To06()).isEqualTo(2301L);
        assertThat(timeSlot.footTrafficTime06To11()).isEqualTo(2302L);
        assertThat(timeSlot.footTrafficTime11To14()).isEqualTo(2303L);
        assertThat(timeSlot.footTrafficTime14To17()).isEqualTo(2304L);
        assertThat(timeSlot.footTrafficTime17To21()).isEqualTo(2305L);
        assertThat(timeSlot.footTrafficTime21To24()).isEqualTo(2306L);
        assertThat(timeSlot.dominantTimeSlotType()).isNotNull();
        assertThat(timeSlot.dominantTimeSlotType().code()).isEqualTo("TIME_SLOT_CODE_2307");
        assertThat(timeSlot.dominantTimeSlotType().name()).isEqualTo("시간대이름2308");
        assertThat(timeSlot.dominantTimeSlotType().description()).isEqualTo("시간대설명2309");

        DistrictGenderFootTrafficQueryResult gender = footTraffic.gender();
        assertThat(gender).isNotNull();
        assertThat(gender.maleFootTraffic()).isEqualTo(2401L);
        assertThat(gender.femaleFootTraffic()).isEqualTo(2402L);
        assertThat(gender.dominantGenderType()).isNotNull();
        assertThat(gender.dominantGenderType().code()).isEqualTo("GENDER_CODE_2403");
        assertThat(gender.dominantGenderType().name()).isEqualTo("성별이름2404");
        assertThat(gender.dominantGenderType().description()).isEqualTo("성별설명2405");

        DistrictAgeGroupFootTrafficQueryResult ageGroup = footTraffic.ageGroup();
        assertThat(ageGroup).isNotNull();
        assertThat(ageGroup.age10FootTraffic()).isEqualTo(2501L);
        assertThat(ageGroup.age20FootTraffic()).isEqualTo(2502L);
        assertThat(ageGroup.age30FootTraffic()).isEqualTo(2503L);
        assertThat(ageGroup.age40FootTraffic()).isEqualTo(2504L);
        assertThat(ageGroup.age50FootTraffic()).isEqualTo(2505L);
        assertThat(ageGroup.age60PlusFootTraffic()).isEqualTo(2506L);
        assertThat(ageGroup.dominantAgeGroupType()).isNotNull();
        assertThat(ageGroup.dominantAgeGroupType().code()).isEqualTo("AGE_GROUP_CODE_2507");
        assertThat(ageGroup.dominantAgeGroupType().name()).isEqualTo("연령대이름2508");
        assertThat(ageGroup.dominantAgeGroupType().description()).isEqualTo("연령대설명2509");

        DistrictDayOfWeekFootTrafficQueryResult dayOfWeek = footTraffic.dayOfWeek();
        assertThat(dayOfWeek).isNotNull();
        assertThat(dayOfWeek.mondayFootTraffic()).isEqualTo(2601L);
        assertThat(dayOfWeek.tuesdayFootTraffic()).isEqualTo(2602L);
        assertThat(dayOfWeek.wednesdayFootTraffic()).isEqualTo(2603L);
        assertThat(dayOfWeek.thursdayFootTraffic()).isEqualTo(2604L);
        assertThat(dayOfWeek.fridayFootTraffic()).isEqualTo(2605L);
        assertThat(dayOfWeek.saturdayFootTraffic()).isEqualTo(2606L);
        assertThat(dayOfWeek.sundayFootTraffic()).isEqualTo(2607L);
        assertThat(dayOfWeek.dominantDayOfWeekType()).isNotNull();
        assertThat(dayOfWeek.dominantDayOfWeekType().code()).isEqualTo("DAY_OF_WEEK_CODE_2608");
        assertThat(dayOfWeek.dominantDayOfWeekType().name()).isEqualTo("요일이름2609");
        assertThat(dayOfWeek.dominantDayOfWeekType().description()).isEqualTo("요일설명2610");
    }

    private static void assertStore(DistrictStoreDetailQueryResult store) {
        assertThat(store).isNotNull();

        assertThat(store.topStoreServices()).hasSize(2);
        assertThat(store.topStoreServices().get(0).serviceCode()).isEqualTo("STORE_SERVICE_CODE_3101");
        assertThat(store.topStoreServices().get(0).serviceName()).isEqualTo("점포업종이름3102");
        assertThat(store.topStoreServices().get(0).totalStoreCount()).isEqualTo(3103L);
        assertThat(store.topStoreServices().get(1).serviceCode()).isEqualTo("STORE_SERVICE_CODE_3104");
        assertThat(store.topStoreServices().get(1).serviceName()).isEqualTo("점포업종이름3105");
        assertThat(store.topStoreServices().get(1).totalStoreCount()).isEqualTo(3106L);

        assertThat(store.topOpenedAdministrations()).hasSize(2);
        assertThat(store.topOpenedAdministrations().get(0).administrationCode()).isEqualTo("OPENED_ADMIN_CODE_3201");
        assertThat(store.topOpenedAdministrations().get(0).administrationName()).isEqualTo("개업행정동이름3202");
        assertThat(store.topOpenedAdministrations().get(0).openedStoreCount()).isEqualTo(3203L);
        assertThat(store.topOpenedAdministrations().get(0).openingRate()).isEqualTo(32.04);
        assertThat(store.topOpenedAdministrations().get(1).administrationCode()).isEqualTo("OPENED_ADMIN_CODE_3205");
        assertThat(store.topOpenedAdministrations().get(1).administrationName()).isEqualTo("개업행정동이름3206");
        assertThat(store.topOpenedAdministrations().get(1).openedStoreCount()).isEqualTo(3207L);
        assertThat(store.topOpenedAdministrations().get(1).openingRate()).isEqualTo(32.08);

        assertThat(store.topClosedAdministrations()).hasSize(2);
        assertThat(store.topClosedAdministrations().get(0).administrationCode()).isEqualTo("CLOSED_ADMIN_CODE_3301");
        assertThat(store.topClosedAdministrations().get(0).administrationName()).isEqualTo("폐업행정동이름3302");
        assertThat(store.topClosedAdministrations().get(0).closedStoreCount()).isEqualTo(3303L);
        assertThat(store.topClosedAdministrations().get(0).closureRate()).isEqualTo(33.04);
        assertThat(store.topClosedAdministrations().get(1).administrationCode()).isEqualTo("CLOSED_ADMIN_CODE_3305");
        assertThat(store.topClosedAdministrations().get(1).administrationName()).isEqualTo("폐업행정동이름3306");
        assertThat(store.topClosedAdministrations().get(1).closedStoreCount()).isEqualTo(3307L);
        assertThat(store.topClosedAdministrations().get(1).closureRate()).isEqualTo(33.08);
    }

    private static void assertSales(DistrictSalesDetailQueryResult sales) {
        assertThat(sales).isNotNull();

        assertThat(sales.topSalesServices()).hasSize(2);
        assertThat(sales.topSalesServices().get(0).serviceCode()).isEqualTo("SALES_SERVICE_CODE_4101");
        assertThat(sales.topSalesServices().get(0).serviceName()).isEqualTo("매출업종이름4102");
        assertThat(sales.topSalesServices().get(0).salesChangeRate()).isEqualTo(41.03);
        assertThat(sales.topSalesServices().get(1).serviceCode()).isEqualTo("SALES_SERVICE_CODE_4104");
        assertThat(sales.topSalesServices().get(1).serviceName()).isEqualTo("매출업종이름4105");
        assertThat(sales.topSalesServices().get(1).salesChangeRate()).isEqualTo(41.06);

        assertThat(sales.topSalesAdministrations()).hasSize(2);
        assertThat(sales.topSalesAdministrations().get(0).administrationCode()).isEqualTo("SALES_ADMIN_CODE_4201");
        assertThat(sales.topSalesAdministrations().get(0).administrationName()).isEqualTo("매출행정동이름4202");
        assertThat(sales.topSalesAdministrations().get(0).totalSalesAmount()).isEqualTo(4203L);
        assertThat(sales.topSalesAdministrations().get(0).salesChangeRate()).isEqualTo(42.04);
        assertThat(sales.topSalesAdministrations().get(1).administrationCode()).isEqualTo("SALES_ADMIN_CODE_4205");
        assertThat(sales.topSalesAdministrations().get(1).administrationName()).isEqualTo("매출행정동이름4206");
        assertThat(sales.topSalesAdministrations().get(1).totalSalesAmount()).isEqualTo(4207L);
        assertThat(sales.topSalesAdministrations().get(1).salesChangeRate()).isEqualTo(42.08);
    }
}
