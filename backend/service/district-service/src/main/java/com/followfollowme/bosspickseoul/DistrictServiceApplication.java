package com.followfollowme.bosspickseoul;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@EnableDiscoveryClient
@SpringBootApplication(scanBasePackages = {
    "com.followfollowme.bosspickseoul.domainlayer",
    "com.followfollowme.bosspickseoul.global"
})
public class DistrictServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(DistrictServiceApplication.class, args);
	}

}
