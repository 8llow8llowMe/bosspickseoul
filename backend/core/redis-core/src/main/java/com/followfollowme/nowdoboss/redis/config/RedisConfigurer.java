package com.followfollowme.nowdoboss.redis.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.followfollowme.nowdoboss.redis.properties.RedisProperties;
import com.followfollowme.nowdoboss.redis.properties.enums.RedisMode;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisSentinelConfiguration;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

public class RedisConfigurer {

    @Bean
    public RedisConnectionFactory redisConnectionFactory(RedisProperties redisProperties) {
        RedisMode mode = redisProperties.mode() != null ? redisProperties.mode() : RedisMode.STANDALONE;
        boolean hasPassword = redisProperties.password() != null && !redisProperties.password().isBlank();

        return switch (mode) {
            case SENTINEL -> createSentinelConnectionFactory(redisProperties, hasPassword);
            case STANDALONE -> createStandaloneConnectionFactory(redisProperties, hasPassword);
        };
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setValueSerializer(redisValueSerializer());
        return redisTemplate;
    }

    private GenericJackson2JsonRedisSerializer redisValueSerializer() {
        // 기본 ObjectMapper 는 java.time 타입(Instant 등)을 지원하지 않으므로 jsr310 모듈을 등록한다.
        return new GenericJackson2JsonRedisSerializer().configure(objectMapper -> {
            objectMapper.registerModule(new JavaTimeModule());
            objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        });
    }

    private LettuceConnectionFactory createSentinelConnectionFactory(RedisProperties redisProperties, boolean hasPassword) {
        RedisSentinelConfiguration sentinelConfig = new RedisSentinelConfiguration()
            .master(redisProperties.masterName());

        redisProperties.sentinels().forEach(node ->
            sentinelConfig.sentinel(node.host(), node.port())
        );

        if (hasPassword) {
            sentinelConfig.setPassword(RedisPassword.of(redisProperties.password()));
        }

        return new LettuceConnectionFactory(sentinelConfig);
    }

    private LettuceConnectionFactory createStandaloneConnectionFactory(RedisProperties redisProperties, boolean hasPassword) {
        RedisStandaloneConfiguration standaloneConfig = new RedisStandaloneConfiguration(redisProperties.host(), redisProperties.port());

        if (hasPassword) {
            standaloneConfig.setPassword(RedisPassword.of(redisProperties.password()));
        }

        return new LettuceConnectionFactory(standaloneConfig);
    }
}
