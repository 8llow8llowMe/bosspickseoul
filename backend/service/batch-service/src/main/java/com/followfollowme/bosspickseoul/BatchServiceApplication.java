package com.followfollowme.bosspickseoul;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@EnableDiscoveryClient
@SpringBootApplication(
    exclude = {
        HibernateJpaAutoConfiguration.class,
        JpaRepositoriesAutoConfiguration.class
    },
    scanBasePackages = {
        "com.followfollowme.bosspickseoul.domainlayer",
        "com.followfollowme.bosspickseoul.global"
    }
)
public class BatchServiceApplication {

    public static void main(String[] args) {
        var context = SpringApplication.run(BatchServiceApplication.class, args);
        if (context.getEnvironment().matchesProfiles("quarterly")) {
            System.exit(SpringApplication.exit(context));
        }
    }
}
