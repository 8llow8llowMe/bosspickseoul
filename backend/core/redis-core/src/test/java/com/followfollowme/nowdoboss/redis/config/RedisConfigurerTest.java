package com.followfollowme.nowdoboss.redis.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.RedisSerializer;

class RedisConfigurerTest {

    record JavaTimePayload(String id, Instant createdAt) {
    }

    @Test
    @SuppressWarnings("unchecked")
    void redisTemplate_valueSerializer_roundTripsJavaTimeTypes() {
        RedisTemplate<String, Object> template = new RedisConfigurer()
            .redisTemplate(new LettuceConnectionFactory());
        RedisSerializer<Object> valueSerializer = (RedisSerializer<Object>) template.getValueSerializer();

        JavaTimePayload payload = new JavaTimePayload("job-1", Instant.parse("2026-08-04T04:39:45Z"));

        byte[] serialized = valueSerializer.serialize(payload);
        Object deserialized = valueSerializer.deserialize(serialized);

        assertThat(deserialized).isEqualTo(payload);
    }
}
