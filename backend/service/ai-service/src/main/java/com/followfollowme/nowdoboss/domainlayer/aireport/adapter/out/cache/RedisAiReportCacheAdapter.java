package com.followfollowme.nowdoboss.domainlayer.aireport.adapter.out.cache;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportErrorCode;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.exception.AiReportException;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.AdministrationAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.CommercialComparisonAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.info.DistrictAiReportInfo;
import com.followfollowme.nowdoboss.domainlayer.aireport.application.port.out.AiReportCachePort;
import com.followfollowme.nowdoboss.global.properties.AiReportCacheProperties;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisAiReportCacheAdapter implements AiReportCachePort {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisProperties redisProperties;
    private final AiReportCacheProperties aiReportCacheProperties;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<CommercialAiReportInfo> getCommercialReport(String commercialCode, String serviceCode, String periodCode) {
        return getValue(buildCommercialKey(commercialCode, serviceCode, periodCode), CommercialAiReportInfo.class);
    }

    @Override
    public void saveCommercialReport(String commercialCode, String serviceCode, String periodCode, CommercialAiReportInfo reportInfo) {
        saveValue(buildCommercialKey(commercialCode, serviceCode, periodCode), reportInfo);
    }

    @Override
    public Optional<CommercialComparisonAiReportInfo> getCommercialComparisonReport(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    ) {
        return getValue(
            buildCommercialComparisonKey(leftCommercialCode, rightCommercialCode, serviceCode, periodCode),
            CommercialComparisonAiReportInfo.class
        );
    }

    @Override
    public void saveCommercialComparisonReport(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode,
        CommercialComparisonAiReportInfo reportInfo
    ) {
        saveValue(buildCommercialComparisonKey(leftCommercialCode, rightCommercialCode, serviceCode, periodCode), reportInfo);
    }

    @Override
    public Optional<DistrictAiReportInfo> getDistrictReport(String districtCode, String periodCode) {
        return getValue(buildDistrictKey(districtCode, periodCode), DistrictAiReportInfo.class);
    }

    @Override
    public void saveDistrictReport(String districtCode, String periodCode, DistrictAiReportInfo reportInfo) {
        saveValue(buildDistrictKey(districtCode, periodCode), reportInfo);
    }

    @Override
    public Optional<AdministrationAiReportInfo> getAdministrationReport(String administrationCode, String periodCode) {
        return getValue(buildAdministrationKey(administrationCode, periodCode), AdministrationAiReportInfo.class);
    }

    @Override
    public void saveAdministrationReport(String administrationCode, String periodCode, AdministrationAiReportInfo reportInfo) {
        saveValue(buildAdministrationKey(administrationCode, periodCode), reportInfo);
    }

    private <T> Optional<T> getValue(String key, Class<T> targetType) {
        try {
            Object value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.convertValue(value, targetType));
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.CACHE_UNAVAILABLE, exception);
        }
    }

    private void saveValue(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, value, aiReportCacheProperties.ttlSeconds(), TimeUnit.SECONDS);
        } catch (RedisConnectionFailureException exception) {
            throw new AiReportException(AiReportErrorCode.CACHE_UNAVAILABLE, exception);
        }
    }

    private String buildCommercialKey(String commercialCode, String serviceCode, String periodCode) {
        return "%s:ai:report:commercial:v2:%s:%s:%s".formatted(redisProperties.normalizedKeyPrefix(), commercialCode, serviceCode, periodCode);
    }

    private String buildDistrictKey(String districtCode, String periodCode) {
        return "%s:ai:report:district:%s:%s".formatted(redisProperties.normalizedKeyPrefix(), districtCode, periodCode);
    }

    private String buildCommercialComparisonKey(
        String leftCommercialCode,
        String rightCommercialCode,
        String serviceCode,
        String periodCode
    ) {
        return "%s:ai:report:commercial-comparison:v1:%s:%s:%s:%s".formatted(
            redisProperties.normalizedKeyPrefix(),
            leftCommercialCode,
            rightCommercialCode,
            serviceCode,
            periodCode
        );
    }

    private String buildAdministrationKey(String administrationCode, String periodCode) {
        return "%s:ai:report:administration:%s:%s".formatted(redisProperties.normalizedKeyPrefix(), administrationCode, periodCode);
    }
}
