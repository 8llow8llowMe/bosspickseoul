package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.common.config.SwaggerSecurityConfigurer;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!prod")
@Import(SwaggerSecurityConfigurer.class)
public class CommunityServiceSwaggerConfig {

    @Bean
    public OpenAPI communityServiceOpenApi(Components components) {
        return new OpenAPI()
            .components(components)
            .info(new Info()
                .title("BossPickSeoul 커뮤니티 서비스 관련 API 명세서")
                .description("Community Service 전용")
                .version("v1")
            )
            // 서버를 상대 경로("/")로 두어, 집계 Swagger UI가 문서를 불러온 공개 origin
            // 기준으로 호출하게 한다(내부 컨테이너 주소로 잡혀 CORS 나는 문제 방지).
            .servers(List.of(
                new Server().url("/").description("API Gateway (실제 호출용)")
            ));
    }
}
