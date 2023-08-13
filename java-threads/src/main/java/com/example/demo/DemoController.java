package com.example.demo;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class DemoController {
    @GetMapping("/test")
    List<String> all(@RequestParam("timeout") String timeout) throws InterruptedException {
        Thread.sleep(Long.parseLong(timeout) * 1000L);
        return List.of("test");
    }
}
