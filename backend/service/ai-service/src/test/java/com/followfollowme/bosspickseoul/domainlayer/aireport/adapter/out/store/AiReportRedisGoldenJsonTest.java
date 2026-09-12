package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.store;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJob;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobStatus;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AiReportJobType;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/**
 * Redis 에 이미 저장되어 있는 JSON 과의 호환을 고정하는 골든 테스트.
 *
 * <p>기존 {@code AiReportJobSerializationTest} 는 writeValueAsString -> readValue 라운드트립이라
 * 타입을 통째로 바꾸면 양쪽이 함께 바뀌어 무조건 통과한다. 여기서는 <b>과거에 기록된 JSON 문자열 리터럴</b>을
 * 출발점으로 삼아 역직렬화 결과를 필드 단위로 검증한다. 그래서 이 파일의 JSON 리터럴은 절대 코드로 생성하지 않는다.
 *
 * <p>{@code FAIL_ON_UNKNOWN_PROPERTIES} 가 꺼져 있어 필드명이 바뀌어도 예외가 나지 않고 조용히 null 이 된다.
 * 즉 이 테스트가 실패하는 순간이 곧 "운영 Redis 에 떠 있는 잡/캐시가 깨지는 순간"이다. 리터럴을 고쳐서 통과시키지 말고,
 * 캐시 키 버전을 올리거나 마이그레이션을 설계해야 한다.
 */
class AiReportRedisGoldenJsonTest {

    // 운영에 실제로 주입되는 빈을 그대로 꺼내 쓴다. ai-service 에는 ObjectMapper 빈 재정의도
    // spring.jackson.* 설정도 없으므로 JacksonAutoConfiguration 결과가 곧 운영 구성이다.
    // 주의: Jackson2ObjectMapperBuilder.json().build() 로 직접 만들면 WRITE_DATES_AS_TIMESTAMPS 가
    // 살아 있어 날짜가 숫자/배열로 나간다. 그 구성으로 골든을 고정하면 운영과 다른 모양을 지키게 된다.
    private static final ObjectMapper OBJECT_MAPPER = autoConfiguredObjectMapper();

    private static ObjectMapper autoConfiguredObjectMapper() {
        AtomicReference<ObjectMapper> holder = new AtomicReference<>();
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .run(context -> holder.set(context.getBean(ObjectMapper.class)));
        return holder.get();
    }

    private final ObjectMapper objectMapper = OBJECT_MAPPER;

    // {prefix}:ai:job:{jobId}
    private static final String JOB_GOLDEN_JSON = """
        {
          "jobId": "9f1c0b42-0f0e-4a51-9f4b-6a3f0a1c2d3e",
          "memberId": 7,
          "jobType": "COMMERCIAL",
          "requestHash": "3f2a9c7d1b",
          "requestParams": {
            "commercialCode": "1000001",
            "serviceCode": "CS100001",
            "periodCode": "20241"
          },
          "status": "COMPLETED",
          "errorCode": null,
          "errorMessage": null,
          "createdAt": "2026-08-04T04:39:45Z",
          "startedAt": "2026-08-04T04:39:46Z",
          "completedAt": "2026-08-04T04:40:00Z",
          "commercialReport": {
            "summary": "역삼역 상권 요약",
            "strengths": ["유동인구 풍부", "직장인 밀집"],
            "risks": ["임대료 높음"],
            "recommendedBusinessCategories": ["한식음식점", "커피전문점"],
            "recommendedCustomerSegments": ["30대 직장인"],
            "recommendedOperatingHours": ["11-14시"],
            "avoidOperatingHours": ["00-06시"],
            "targetAgeGroups": ["30대", "40대"],
            "targetGenders": ["남성"],
            "operationTips": ["점심 회전율을 높이세요"],
            "businessInsight": "점심 특화 전략이 유효합니다.",
            "generatedAt": "2026-08-04T13:39:45"
          },
          "commercialComparisonReport": null,
          "districtReport": null,
          "administrationReport": null
        }
        """;

    // {prefix}:ai:report:commercial:v2:{commercialCode}:{serviceCode}:{periodCode}
    private static final String COMMERCIAL_REPORT_GOLDEN_JSON = """
        {
          "summary": "역삼역 상권 요약",
          "strengths": ["유동인구 풍부", "직장인 밀집"],
          "risks": ["임대료 높음"],
          "recommendedBusinessCategories": ["한식음식점", "커피전문점"],
          "recommendedCustomerSegments": ["30대 직장인"],
          "recommendedOperatingHours": ["11-14시"],
          "avoidOperatingHours": ["00-06시"],
          "targetAgeGroups": ["30대", "40대"],
          "targetGenders": ["남성"],
          "operationTips": ["점심 회전율을 높이세요"],
          "businessInsight": "점심 특화 전략이 유효합니다.",
          "generatedAt": "2026-08-04T13:39:45"
        }
        """;

    // {prefix}:ai:report:commercial-comparison:v1:{leftCode}:{rightCode}:{serviceCode}:{periodCode}
    private static final String COMMERCIAL_COMPARISON_REPORT_GOLDEN_JSON = """
        {
          "summary": "두 상권 비교 요약",
          "recommendedSide": "LEFT",
          "recommendedReasons": ["매출 규모 우위", "폐업률 낮음"],
          "riskComparison": "오른쪽 상권은 경쟁 강도가 높습니다.",
          "timeSlotInsight": "왼쪽은 점심, 오른쪽은 저녁이 강합니다.",
          "customerSegmentInsight": "왼쪽은 직장인, 오른쪽은 거주민 중심입니다.",
          "operationStrategy": ["점심 세트 구성", "저녁 주류 매출 강화"],
          "businessInsight": "초기 진입은 왼쪽 상권이 유리합니다.",
          "generatedAt": "2026-08-04T13:39:45"
        }
        """;

    // {prefix}:ai:report:district:v1:{districtCode}:{periodCode}
    private static final String DISTRICT_REPORT_GOLDEN_JSON = """
        {
          "summary": "강남구 자치구 요약",
          "marketStatus": "성장",
          "recommendedBusinessCategories": ["커피전문점"],
          "cautionBusinessCategories": ["호프-간이주점"],
          "businessInsight": "오피스 수요 중심으로 접근하세요.",
          "generatedAt": "2026-08-04T13:39:45"
        }
        """;

    // {prefix}:ai:report:administration:v1:{administrationCode}:{periodCode}
    private static final String ADMINISTRATION_REPORT_GOLDEN_JSON = """
        {
          "summary": "역삼1동 행정동 요약",
          "marketStatus": "정체",
          "recommendedBusinessCategories": ["분식전문점"],
          "cautionBusinessCategories": ["노래방"],
          "businessInsight": "배달 채널 병행이 필요합니다.",
          "generatedAt": "2026-08-04T13:39:45"
        }
        """;

    @Test
    @DisplayName("저장된 잡 JSON 은 모든 컴포넌트로 복원된다")
    void jobGoldenJson_restoresEveryComponent() throws Exception {
        AiReportJob job = objectMapper.readValue(JOB_GOLDEN_JSON, AiReportJob.class);

        assertThat(job.jobId()).isEqualTo("9f1c0b42-0f0e-4a51-9f4b-6a3f0a1c2d3e");
        assertThat(job.memberId()).isEqualTo(7L);
        assertThat(job.jobType()).isEqualTo(AiReportJobType.COMMERCIAL);
        assertThat(job.requestHash()).isEqualTo("3f2a9c7d1b");
        assertThat(job.requestParams())
            .containsExactlyInAnyOrderEntriesOf(Map.of("commercialCode", "1000001", "serviceCode", "CS100001", "periodCode", "20241"));
        assertThat(job.status()).isEqualTo(AiReportJobStatus.COMPLETED);
        assertThat(job.errorCode()).isNull();
        assertThat(job.errorMessage()).isNull();
        assertThat(job.createdAt()).isEqualTo(Instant.parse("2026-08-04T04:39:45Z"));
        assertThat(job.startedAt()).isEqualTo(Instant.parse("2026-08-04T04:39:46Z"));
        assertThat(job.completedAt()).isEqualTo(Instant.parse("2026-08-04T04:40:00Z"));
        assertThat(job.commercialComparisonReport()).isNull();
        assertThat(job.districtReport()).isNull();
        assertThat(job.administrationReport()).isNull();

        // 중첩 리포트가 통째로 null 이 되는 무증상 회귀가 이 리팩토링의 가장 큰 위험이다.
        assertThat(job.commercialReport()).isNotNull();
        assertCommercialReport(job.commercialReport());
    }

    @Test
    @DisplayName("status 는 최상위 문자열이어야 한다 - 어댑터 Lua CAS 의 암묵 계약")
    void jobJson_keepsStatusAsTopLevelString() throws Exception {
        // RedisAiReportJobStoreAdapter 의 SAVE_IF_STATUS_SCRIPT 가 cjson.decode(current).status 를
        // ARGV[1](= expectedStatus.name()) 과 직접 비교한다. status 가 중첩되거나 객체/숫자로 바뀌면
        // 모든 상태 전이(CAS)가 조용히 false 가 되어 잡이 영원히 PENDING 에 머문다.
        // Java 코드만 봐서는 드러나지 않는 계약이라 여기에 못 박아 둔다.
        JsonNode storedShape = objectMapper.readTree(JOB_GOLDEN_JSON);
        assertThat(storedShape.get("status").isTextual()).isTrue();
        assertThat(storedShape.get("status").asText()).isEqualTo(AiReportJobStatus.COMPLETED.name());

        AiReportJob running = AiReportJob.builder()
            .jobId("J1").memberId(7L).jobType(AiReportJobType.COMMERCIAL).requestHash("H")
            .requestParams(Map.of("commercialCode", "1000001"))
            .status(AiReportJobStatus.RUNNING)
            .createdAt(Instant.parse("2026-08-04T04:39:45Z"))
            .build();
        JsonNode writtenShape = objectMapper.readTree(objectMapper.writeValueAsString(running));
        assertThat(writtenShape.get("status").isTextual()).isTrue();
        assertThat(writtenShape.get("status").asText()).isEqualTo("RUNNING");
    }

    @Test
    @DisplayName("상권 리포트 캐시 JSON 은 모든 컴포넌트로 복원된다")
    void commercialReportGoldenJson_restoresEveryComponent() throws Exception {
        assertCommercialReport(objectMapper.readValue(COMMERCIAL_REPORT_GOLDEN_JSON, CommercialAiReportSnapshot.class));
    }

    @Test
    @DisplayName("상권 비교 리포트 캐시 JSON 은 모든 컴포넌트로 복원된다")
    void commercialComparisonReportGoldenJson_restoresEveryComponent() throws Exception {
        CommercialComparisonAiReportSnapshot report =
            objectMapper.readValue(COMMERCIAL_COMPARISON_REPORT_GOLDEN_JSON, CommercialComparisonAiReportSnapshot.class);

        assertThat(report.summary()).isEqualTo("두 상권 비교 요약");
        assertThat(report.recommendedSide()).isEqualTo("LEFT");
        assertThat(report.recommendedReasons()).containsExactly("매출 규모 우위", "폐업률 낮음");
        assertThat(report.riskComparison()).isEqualTo("오른쪽 상권은 경쟁 강도가 높습니다.");
        assertThat(report.timeSlotInsight()).isEqualTo("왼쪽은 점심, 오른쪽은 저녁이 강합니다.");
        assertThat(report.customerSegmentInsight()).isEqualTo("왼쪽은 직장인, 오른쪽은 거주민 중심입니다.");
        assertThat(report.operationStrategy()).containsExactly("점심 세트 구성", "저녁 주류 매출 강화");
        assertThat(report.businessInsight()).isEqualTo("초기 진입은 왼쪽 상권이 유리합니다.");
        assertThat(report.generatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 4, 13, 39, 45));
    }

    @Test
    @DisplayName("자치구 리포트 캐시 JSON 은 모든 컴포넌트로 복원된다")
    void districtReportGoldenJson_restoresEveryComponent() throws Exception {
        DistrictAiReportSnapshot report = objectMapper.readValue(DISTRICT_REPORT_GOLDEN_JSON, DistrictAiReportSnapshot.class);

        assertThat(report.summary()).isEqualTo("강남구 자치구 요약");
        assertThat(report.marketStatus()).isEqualTo("성장");
        assertThat(report.recommendedBusinessCategories()).containsExactly("커피전문점");
        assertThat(report.cautionBusinessCategories()).containsExactly("호프-간이주점");
        assertThat(report.businessInsight()).isEqualTo("오피스 수요 중심으로 접근하세요.");
        assertThat(report.generatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 4, 13, 39, 45));
    }

    @Test
    @DisplayName("행정동 리포트 캐시 JSON 은 모든 컴포넌트로 복원된다")
    void administrationReportGoldenJson_restoresEveryComponent() throws Exception {
        AdministrationAiReportSnapshot report =
            objectMapper.readValue(ADMINISTRATION_REPORT_GOLDEN_JSON, AdministrationAiReportSnapshot.class);

        assertThat(report.summary()).isEqualTo("역삼1동 행정동 요약");
        assertThat(report.marketStatus()).isEqualTo("정체");
        assertThat(report.recommendedBusinessCategories()).containsExactly("분식전문점");
        assertThat(report.cautionBusinessCategories()).containsExactly("노래방");
        assertThat(report.businessInsight()).isEqualTo("배달 채널 병행이 필요합니다.");
        assertThat(report.generatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 4, 13, 39, 45));
    }

    @Test
    @DisplayName("generatedAt 은 타임존 없는 로컬 시각 문자열이다 - 응답 DTO 4종의 프론트 계약")
    void generatedAt_staysLocalDateTimeString() throws Exception {
        // 응답 DTO 4종이 LocalDateTime 이라 Instant 로 바꾸면 뒤에 Z 가 붙어 프론트 파싱이 깨진다.
        JsonNode node = objectMapper.readTree(objectMapper.writeValueAsString(commercialReportFixture()));

        assertThat(node.get("generatedAt").isTextual()).isTrue();
        assertThat(node.get("generatedAt").asText()).isEqualTo("2026-08-04T13:39:45");
    }

    private void assertCommercialReport(CommercialAiReportSnapshot report) {
        assertThat(report.summary()).isEqualTo("역삼역 상권 요약");
        assertThat(report.strengths()).containsExactly("유동인구 풍부", "직장인 밀집");
        assertThat(report.risks()).containsExactly("임대료 높음");
        assertThat(report.recommendedBusinessCategories()).containsExactly("한식음식점", "커피전문점");
        assertThat(report.recommendedCustomerSegments()).containsExactly("30대 직장인");
        assertThat(report.recommendedOperatingHours()).containsExactly("11-14시");
        assertThat(report.avoidOperatingHours()).containsExactly("00-06시");
        assertThat(report.targetAgeGroups()).containsExactly("30대", "40대");
        assertThat(report.targetGenders()).containsExactly("남성");
        assertThat(report.operationTips()).containsExactly("점심 회전율을 높이세요");
        assertThat(report.businessInsight()).isEqualTo("점심 특화 전략이 유효합니다.");
        assertThat(report.generatedAt()).isEqualTo(LocalDateTime.of(2026, 8, 4, 13, 39, 45));
    }

    private CommercialAiReportSnapshot commercialReportFixture() throws Exception {
        return objectMapper.readValue(COMMERCIAL_REPORT_GOLDEN_JSON, CommercialAiReportSnapshot.class);
    }
}
