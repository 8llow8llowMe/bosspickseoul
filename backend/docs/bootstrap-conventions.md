# Bootstrap Conventions

## Application

- 서비스 애플리케이션은 아래 패턴을 기본으로 사용한다.

```java
@EnableDiscoveryClient
@SpringBootApplication(scanBasePackages = {
    "com.followfollowme.nowdoboss.domainlayer",
    "com.followfollowme.nowdoboss.global"
})
public class XxxServiceApplication {
}
```

- Feign이 필요한 서비스만 `@EnableFeignClients`를 추가한다.

```java
@EnableFeignClients
@EnableDiscoveryClient
@SpringBootApplication(scanBasePackages = {
    "com.followfollowme.nowdoboss.domainlayer",
    "com.followfollowme.nowdoboss.global"
})
public class XxxServiceApplication {
}
```

## Global Config

- 서비스 전역 설정은 `global.config` 아래에서 역할별로 분리한다.
- 권장 파일 구성:
  - `*BeansConfig`
  - `*PropertiesConfig`
  - `*FeaturesConfig`

```java
@Configuration
@Import({
    JasyptConfigurer.class,
    SnowflakeConfigurer.class,
    ResourceServerSecurityConfigurer.class
})
public class XxxServiceBeansConfig {
}
```

```java
@Configuration
@Import({
    JasyptPropertiesConfig.class,
    SwaggerPropertiesConfig.class,
    SnowflakePropertiesConfig.class
})
public class XxxServicePropertiesConfig {
}
```

```java
@Configuration
@Import({
    JpaAuditConfig.class
})
public class XxxServiceFeaturesConfig {
}
```

## Reason

- 스캔 범위를 `domainlayer`, `global`로 제한하면 서비스 내부 구조가 명확해진다.
- 공통 설정을 서비스별 config에서 명시적으로 import하면 어떤 설정이 왜 로딩되는지 바로 보인다.
- `Beans / Properties / Features`를 분리하면 신규 서비스 추가와 리팩토링 때 템플릿처럼 재사용하기 쉽다.
