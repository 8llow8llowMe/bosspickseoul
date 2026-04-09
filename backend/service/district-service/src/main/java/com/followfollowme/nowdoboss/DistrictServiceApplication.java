package com.followfollowme.nowdoboss;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "com.followfollowme.nowdoboss.domainlayer.map.adapter.out.client.feign")
public class DistrictServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(DistrictServiceApplication.class, args);
	}

}
