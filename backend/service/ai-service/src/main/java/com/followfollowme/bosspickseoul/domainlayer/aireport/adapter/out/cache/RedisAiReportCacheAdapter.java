package com.followfollowme.bosspickseoul.domainlayer.aireport.adapter.out.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.bosspickseoul.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.AdministrationAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.CommercialComparisonAiReportSnapshot;
import com.followfollowme.bosspickseoul.domainlayer.aireport.domain.model.DistrictAiReportSnapshot;
import com.followfollowme.bosspickseoul.global.properties.AiReportCacheProperties;
import com.followfollowme.bosspickseoul.redis.properties.RedisProperties;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * AI 리포트 결과 스냅샷의 Redis 캐시 어댑터.
 *
 * <p>키 4종은 모두 {@code {prefix}:ai:report:{kind}:{version}:{식별자...}} 모양이고, 버전 세그먼트 값은
 * {@link AiReportCacheKeyVersion} 한 곳에만 존재한다. 버전을 올리면 배포 직후 전 사용자가 캐시 미스를 맞으므로
 * 올릴지 말지는 {@code backend/docs/services/ai-service.md} 의 "AI 리포트 캐시 무효화 런북" 기준을 따른다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAiReportCacheAdapter implements AiReportCachePort {

    private final StringRedisTemplate stringRedisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportCacheProperties aiReportCacheProperties;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<CommercialAiReportSnapshot> getCommercialReport(String commercialCode, String serviceCode, String periodCode) {
        return getValue(buildCommercialKey(commercialCode, serviceCode, periodCode), CommercialAiReportSnapshot.class);
    }

    @Override
    public void saveCommercialReport(String commercialCode, String serviceCode, String periodCode, CommercialAiReportSnapshot reportSnapshot) {
        saveValue(buildCommercialKey(commercialCode, serviceCode, periodCode), reportSnapshot);
    }

    @Override
    public Optional<CommercialComparisonAiReportSnapshot> getCommercialComparisonReport(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        return getValue(
            buildCommercialComparisonKey(leftCommercialCode, rightCommercialCode, serviceCode, periodCode),
            CommercialComparisonAiReportSnapshot.class
        );
    }

    @Override
    public void saveCommercialComparisonReport(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode, CommercialComparisonAiReportSnapshot reportSnapshot
    ) {
        saveValue(buildCommercialComparisonKey(leftCommercialCode, rightCommercialCode, serviceCode, periodCode), reportSnapshot);
    }

    @Override
    public Optional<DistrictAiReportSnapshot> getDistrictReport(String districtCode, String periodCode) {
        return getValue(buildDistrictKey(districtCode, periodCode), DistrictAiReportSnapshot.class);
    }

    @Override
    public void saveDistrictReport(String districtCode, String periodCode, DistrictAiReportSnapshot reportSnapshot) {
        saveValue(buildDistrictKey(districtCode, periodCode), reportSnapshot);
    }

    @Override
    public Optional<AdministrationAiReportSnapshot> getAdministrationReport(String administrationCode, String periodCode) {
        return getValue(buildAdministrationKey(administrationCode, periodCode), AdministrationAiReportSnapshot.class);
    }

    @Override
    public void saveAdministrationReport(String administrationCode, String periodCode, AdministrationAiReportSnapshot reportSnapshot) {
        saveValue(buildAdministrationKey(administrationCode, periodCode), reportSnapshot);
    }

    private <T> Optional<T> getValue(String key, Class<T> targetType) {
        try {
            String json = stringRedisTemplate.opsForValue().get(key);
            if (json == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, targetType));
        } catch (JsonProcessingException exception) {
            // 구버전/손상 캐시는 미스로 간주하고 새 리포트 생성 후 덮어쓴다.
            log.warn("AI 리포트 캐시 데이터를 해석할 수 없어 캐시 미스로 처리합니다. key={} reason={}", key, exception.getMessage());
            return Optional.empty();
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.CACHE_UNAVAILABLE, exception);
        }
    }

    private void saveValue(String key, Object value) {
        try {
            stringRedisTemplate.opsForValue().set(
                key, objectMapper.writeValueAsString(value), aiReportCacheProperties.ttlSeconds(), TimeUnit.SECONDS
            );
        } catch (JsonProcessingException | RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.CACHE_UNAVAILABLE, exception);
        }
    }

    private String buildCommercialKey(String commercialCode, String serviceCode, String periodCode) {
        return "%s:ai:report:commercial:%s:%s:%s:%s".formatted(
            redisProperties.normalizedKeyPrefix(), AiReportCacheKeyVersion.COMMERCIAL, commercialCode, serviceCode, periodCode
        );
    }

    private String buildDistrictKey(String districtCode, String periodCode) {
        return "%s:ai:report:district:%s:%s:%s".formatted(
            redisProperties.normalizedKeyPrefix(), AiReportCacheKeyVersion.DISTRICT, districtCode, periodCode
        );
    }

    private String buildCommercialComparisonKey(
        String leftCommercialCode, String rightCommercialCode, String serviceCode, String periodCode
    ) {
        return "%s:ai:report:commercial-comparison:%s:%s:%s:%s:%s".formatted(
            redisProperties.normalizedKeyPrefix(),
            AiReportCacheKeyVersion.COMMERCIAL_COMPARISON,
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
    }

    private String buildAdministrationKey(String administrationCode, String periodCode) {
        return "%s:ai:report:administration:%s:%s:%s".formatted(
            redisProperties.normalizedKeyPrefix(), AiReportCacheKeyVersion.ADMINISTRATION, administrationCode, periodCode
        );
    }
}
