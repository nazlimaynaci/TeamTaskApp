package com.nazlim.test2todolist.controllers;

import com.nazlim.test2todolist.dto.InviteCodeResponse;
import com.nazlim.test2todolist.services.InviteCodeService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invite-codes")
@PreAuthorize("hasRole('MANAGER')")
public class InviteCodeController {

    private final InviteCodeService service;

    public InviteCodeController(InviteCodeService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InviteCodeResponse generate() {
        return service.generate();
    }

    @GetMapping("/mine")
    public List<InviteCodeResponse> getMine() {
        return service.getMine();
    }
}
