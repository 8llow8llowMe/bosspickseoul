package com.followfollowme.bosspickseoul.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springdoc.core.configuration.SpringDocConfiguration;
import org.springdoc.core.properties.SpringDocConfigProperties;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration;
import org.springdoc.webmvc.ui.SwaggerConfig;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;

/**
 * springdoc 이 Swagger UI 리소스 핸들러를 등록하는 단계에서 컨텍스트가 뜨는지 못 박는다.
 *
 * <p>이 테스트가 없어서 실제로 사고가 났다. springdoc 2.8.6 에서 2.9.1 로 올린 PR #357 이
 * 컴파일과 단위 테스트를 모두 통과해 머지됐지만, 웹 서비스 7 개가 기동 자체를 못 했다:
 *
 * <pre>
 * Invalid mapping pattern detected:
 * /swagger-ui/&#42;&#42;/&#42;index.html
 *            ^
 * No more pattern data allowed after {&#42;...} or &#42;&#42; pattern element
 * </pre>
 *
 * <p>springdoc 2.9.x 가 새로 넣은 {@code AbstractSwaggerConfigurer} 는 {@code PathPatternParser}
 * 로 리소스 핸들러 패턴을 조립한다. 그런데 Spring Framework 6.2.6 의 {@code PathPattern#combine}
 * 버그(<a href="https://github.com/spring-projects/spring-framework/issues/34986">#34986</a>,
 * 6.2.8 에서 수정)가 {@code /&#42;&#42;} 뒤에 데이터가 붙은 문자열을 만들어 파싱에서 거부됐다.
 * springdoc 2.9.1 의 parent 는 Spring Boot 3.5.16 인데 저장소는 3.4.5(Framework 6.2.6)였다.
 *
 * <p>검증 방식: {@code resourceHandlerMapping} 빈이 만들어질 때 springdoc 의
 * {@code addResourceHandlers} 가 호출되고 패턴이 파싱된다. 그 빈의 존재를 확인하는 것으로
 * 실패 경로를 그대로 태운다. Boot 3.4.5 로 내리면 이 테스트는 실패한다.
 *
 * <p>애플리케이션 전체를 띄우지 않는다. DB·Redis·Eureka 없이 WebMvc 와 springdoc 자동설정만
 * 올려 이 경로만 본다. 그래서 CI 에 외부 의존이 필요 없다.
 */
class SwaggerUiResourceHandlerStartupTest {

    private final WebApplicationContextRunner contextRunner = new WebApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(
                    WebMvcAutoConfiguration.class,
                    SpringDocConfiguration.class,
                    SpringDocConfigProperties.class,
                    SpringDocWebMvcConfiguration.class,
                    SwaggerConfig.class,
                    SwaggerUiConfigProperties.class,
                    SwaggerUiOAuthProperties.class));

    @Test
    @DisplayName("Swagger UI 리소스 핸들러 패턴이 파싱되고 컨텍스트가 기동한다")
    void swaggerUiResourceHandlerStarts() {
        contextRunner.run(context -> assertThat(context.getStartupFailure()).isNull());
    }

    @Test
    @DisplayName("리소스 핸들러 매핑 빈이 등록된다")
    void resourceHandlerMappingIsRegistered() {
        contextRunner.run(context ->
                assertThat(context.containsBean("resourceHandlerMapping")).isTrue());
    }
}
