package com.nazlim.test2todolist.controllers;

import com.nazlim.test2todolist.dto.MyProfileResponse;
import com.nazlim.test2todolist.dto.UserSummaryResponse;
import com.nazlim.test2todolist.services.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public MyProfileResponse getMyProfile() {
        return service.getMyProfile();
    }

    @GetMapping("/workers")
    @PreAuthorize("hasRole('MANAGER')")
    public List<UserSummaryResponse> getWorkers() {
        return service.getWorkers();
    }

}
