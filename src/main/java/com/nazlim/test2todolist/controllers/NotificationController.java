package com.nazlim.test2todolist.controllers;

import com.nazlim.test2todolist.dto.NotificationResponse;
import com.nazlim.test2todolist.services.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public List<NotificationResponse> getMyNotifications() {
        return service.getMyNotifications();
    }

    @PutMapping("/read/{id}")
    public void markRead(@PathVariable Long id) {
        service.markRead(id);
    }

    @PutMapping("/read-all")
    public void markAllRead() {
        service.markAllRead();
    }
}
