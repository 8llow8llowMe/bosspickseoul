package com.followfollowme.nowdoboss.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;

public class SwaggerSecurityConfigurer {

    @Bean
    public Components swaggerComponents() {
        return new Components().addSecuritySchemes("bearerAuth",
            new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT"));
    }

    /**
     * API Gateway 집계 Swagger UI에서 "Try it out" 호출 시 서버 주소를 상대 경로로 고정한다.
     *
     * springdoc 기본 동작은 문서 요청을 받은 host:port로 servers[0].url을 자동 생성한다.
     * 게이트웨이가 lb:// 로 라우팅하며 Host를 내부 컨테이너 주소(예: http://<containerId>:8083)로
     * 치환하므로, 집계 UI에서 호출하면 브라우저가 도달할 수 없는 내부 주소로 요청해
     * CORS / Failed to fetch 가 발생한다.
     *
     * 서버를 "/" 상대 경로로 지정하면 Swagger UI가 문서를 불러온 공개 origin
     * (예: https://api-dev.bosspickseoul.com) 기준으로 해석하므로, 동일 origin으로 호출되어
     * nginx -> api-gateway 경유(또는 auth 단독) 경로를 그대로 탄다.
     */
    @Bean
    public OpenApiCustomizer swaggerRelativeServerCustomizer() {
        return openApi -> openApi.setServers(List.of(new Server().url("/")));
    }
}
