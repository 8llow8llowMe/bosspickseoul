package com.followfollowme.bosspickseoul.global.config;

import com.followfollowme.bosspickseoul.global.properties.DatasetSpatialVersion;
import com.followfollowme.bosspickseoul.persistence.config.QuerydslConfigurer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Import;

/**
 * {@code @DataJpaTest} 슬라이스가 이 서비스의 리포지터리를 올릴 때 반드시 필요한 빈을 모아둔다.
 *
 * <p>슬라이스는 {@code @Component} 를 올리지 않는다. 그런데 QueryDSL 커스텀 리포지터리 구현
 * 일부가 {@link DatasetSpatialVersion} 을 생성자로 받는다. 이들은 리포지터리 <b>프래그먼트</b>라
 * 슬라이스에 자동으로 포함되므로, 그 빈이 없으면 자치구와 무관한 정책·시뮬레이션 테스트까지
 * 컨텍스트 로딩 단계에서 전부 죽는다.
 *
 * <p>테스트마다 {@code @Import} 를 붙이는 방식은 쓰지 않는다. 새 {@code @DataJpaTest} 를 추가할
 * 때마다 같은 함정을 다시 밟기 때문이다. 대신
 * {@code META-INF/spring/org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureDataJpa.imports}
 * 에 이 클래스를 등록해 <b>모든</b> {@code @DataJpaTest} 에 자동으로 적용한다. 그래서 테스트 쪽에는
 * 아무 애노테이션도 추가할 필요가 없다.
 *
 * <p>{@link DatasetSpatialVersion} 은 {@code @Bean} 으로 새로 만들지 않고 원본 클래스를 그대로
 * import 한다. 생성자의 {@code @Value} 기본값을 그대로 타므로 운영과 같은 값으로 해석된다.
 */
@TestConfiguration(proxyBeanMethods = false)
@Import({QuerydslConfigurer.class, DatasetSpatialVersion.class})
public class DataJpaSliceTestConfig {
}
