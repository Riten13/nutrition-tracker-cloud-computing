package com.example.fooddatabase;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class FoodDatabaseApplication {

    public static void main(String[] args) {
        SpringApplication.run(FoodDatabaseApplication.class, args);
    }
}
