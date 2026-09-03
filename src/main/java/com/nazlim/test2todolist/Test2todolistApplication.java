package com.nazlim.test2todolist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Test2todolistApplication {

	public static void main(String[] args) {
		SpringApplication.run(Test2todolistApplication.class, args);
	}

}
