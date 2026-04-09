package com.followfollowme.nowdoboss;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "com.followfollowme.nowdoboss.domainlayer.commercial.adapter.out.client.feign")
public class CommercialServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CommercialServiceApplication.class, args);
    }

}
