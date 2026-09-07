package com.nazlim.test2todolist.controllers;

import com.nazlim.test2todolist.dto.MyTeamResponse;
import com.nazlim.test2todolist.dto.TeamRequest;
import com.nazlim.test2todolist.dto.TeamResponse;
import com.nazlim.test2todolist.dto.TeamWorkloadResponse;
import com.nazlim.test2todolist.dto.UserSummaryResponse;
import com.nazlim.test2todolist.dto.WorkerDetailResponse;
import com.nazlim.test2todolist.services.TeamService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@PreAuthorize("hasRole('MANAGER')")
public class TeamController {

    private final TeamService service;

    public TeamController(TeamService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse create(@Valid @RequestBody TeamRequest req) {
        return service.createTeam(req);
    }

    @GetMapping("/mine")
    public List<TeamResponse> getMine() {
        return service.getMyTeams();
    }

    @GetMapping("/mine/workload")
    public List<TeamWorkloadResponse> getMyTeamsWorkload() {
        return service.getMyTeamsWorkload();
    }

    @GetMapping("/members/{workerId}/detail")
    public WorkerDetailResponse getMemberDetail(@PathVariable Long workerId) {
        return service.getMemberDetail(workerId);
    }

    @PutMapping("/{teamId}/members/{workerId}")
    public TeamResponse addMember(@PathVariable Long teamId, @PathVariable Long workerId) {
        return service.addMember(teamId, workerId);
    }

    @DeleteMapping("/{teamId}/members/{workerId}")
    public TeamResponse removeMember(@PathVariable Long teamId, @PathVariable Long workerId) {
        return service.removeMember(teamId, workerId);
    }

    @DeleteMapping("/{teamId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long teamId) {
        service.deleteTeam(teamId);
    }

    // Sınıf seviyesindeki @PreAuthorize("MANAGER") kuralını bu tek endpoint için eziyor:
    // burada çalışanın kendi ekip/yönetici bilgisini görmesi gerekiyor, yönetici değil.
    @GetMapping("/my-team")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<MyTeamResponse> getMyTeam() {
        MyTeamResponse response = service.getMyTeam();
        return response != null ? ResponseEntity.ok(response) : ResponseEntity.noContent().build();
    }

    @GetMapping("/my-teammates")
    @PreAuthorize("hasRole('WORKER')")
    public List<UserSummaryResponse> getMyTeammates() {
        return service.getMyTeammates();
    }
}
