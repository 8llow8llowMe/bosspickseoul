package com.followfollowme.bosspickseoul.domainlayer.district.adapter.out.persistence.repository.custom;

import java.util.List;
import java.util.Locale;
import java.util.concurrent.CopyOnWriteArrayList;
import org.hibernate.resource.jdbc.spi.StatementInspector;

/**
 * 테스트 전용 Hibernate {@link StatementInspector}. 실행되는 SQL 을 바꾸지 않고 모아 두기만 한다.
 *
 * <p>H2 는 GROUP BY 결과를 그룹 키 오름차순으로 내놓아서, 자치구별로 묶는 쿼리는 {@code ORDER BY} 에서 동점 정렬을 지워도 결과 순서가
 * 그대로다. MySQL 은 그 순서를 보장하지 않는다. 그래서 동점 정렬은 결과가 아니라 <b>생성된 SQL</b> 로 못 박는다.
 *
 * <p>Hibernate 가 클래스 이름으로 인스턴스를 만들므로 public 무인자 생성자가 필요하고, 모은 SQL 은 static 이다. 쓰는 테스트는
 * {@code spring.jpa.properties.hibernate.session_factory.statement_inspector} 로 이 클래스를 지정하고, 질의 직전에 {@link #clear()} 한다.
 */
public class SqlCapturingStatementInspector implements StatementInspector {

    private static final List<String> STATEMENTS = new CopyOnWriteArrayList<>();

    @Override
    public String inspect(String sql) {
        STATEMENTS.add(sql);
        return sql;
    }

    public static void clear() {
        STATEMENTS.clear();
    }

    /** 마지막 {@link #clear()} 이후 실행된 select 중 마지막 것. */
    public static String lastSelect() {
        return STATEMENTS.stream()
            .filter(sql -> sql.stripLeading().toLowerCase(Locale.ROOT).startsWith("select"))
            .reduce((first, second) -> second)
            .orElseThrow(() -> new AssertionError("캡처된 select 가 없다"));
    }
}
