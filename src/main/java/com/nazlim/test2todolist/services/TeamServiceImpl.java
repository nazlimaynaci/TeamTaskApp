package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.MemberWorkloadResponse;
import com.nazlim.test2todolist.dto.MyTeamResponse;
import com.nazlim.test2todolist.dto.TeamRequest;
import com.nazlim.test2todolist.dto.TeamResponse;
import com.nazlim.test2todolist.dto.TeamWorkloadResponse;
import com.nazlim.test2todolist.dto.UserSummaryResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.ApprovalStatus;
import com.nazlim.test2todolist.entity.Role;
import com.nazlim.test2todolist.entity.Team;
import com.nazlim.test2todolist.repository.TeamRepository;
import com.nazlim.test2todolist.repository.TodoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teams;
    private final UserRepository users;
    private final TodoRepository todos;

    public TeamServiceImpl(TeamRepository teams, UserRepository users, TodoRepository todos) {
        this.teams = teams;
        this.users = users;
        this.todos = todos;
    }

    @Override
    public TeamResponse createTeam(TeamRequest request) {
        AppUser manager = getCurrentUser();

        Team team = new Team();
        team.setName(request.name());
        team.setManager(manager);

        return toResponse(teams.save(team));
    }

    @Override
    public List<TeamResponse> getMyTeams() {
        AppUser manager = getCurrentUser();

        return teams.findByManager(manager)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public TeamResponse addMember(Long teamId, Long workerId) {
        AppUser manager = getCurrentUser();
        Team team = getOwnedTeam(teamId, manager);

        AppUser worker = users.findById(workerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Çalışan bulunamadı"));

        if (worker.getRole() != Role.WORKER) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sadece çalışanlar ekibe eklenebilir");
        }
        if (worker.getTeam() != null && !worker.getTeam().getManager().getId().equals(manager.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu çalışan başka bir yöneticinin ekibinde");
        }

        worker.setTeam(team);
        users.save(worker);

        return toResponse(teams.findById(teamId).orElseThrow());
    }

    @Override
    public TeamResponse removeMember(Long teamId, Long workerId) {
        AppUser manager = getCurrentUser();
        Team team = getOwnedTeam(teamId, manager);

        AppUser worker = users.findById(workerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Çalışan bulunamadı"));

        if (worker.getTeam() == null || !worker.getTeam().getId().equals(team.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu çalışan bu ekipte değil");
        }

        worker.setTeam(null);
        users.save(worker);

        return toResponse(teams.findById(teamId).orElseThrow());
    }

    @Override
    public void deleteTeam(Long teamId) {
        AppUser manager = getCurrentUser();
        Team team = getOwnedTeam(teamId, manager);

        team.getMembers().forEach(member -> member.setTeam(null));
        users.saveAll(team.getMembers());

        teams.delete(team);
    }

    @Override
    public MyTeamResponse getMyTeam() {
        AppUser worker = getCurrentUser();
        Team team = worker.getTeam();

        if (team == null) {
            return null;
        }

        AppUser manager = team.getManager();
        return new MyTeamResponse(team.getName(), manager.getFullName(), manager.getUsername());
    }

    @Override
    public List<UserSummaryResponse> getMyTeammates() {
        AppUser worker = getCurrentUser();
        Team team = worker.getTeam();

        if (team == null) {
            return List.of();
        }

        return team.getMembers().stream()
                .filter(m -> !m.getId().equals(worker.getId()))
                .map(m -> new UserSummaryResponse(m.getId(), m.getUsername(), m.getFullName()))
                .toList();
    }

    @Override
    public List<TeamWorkloadResponse> getMyTeamsWorkload() {
        AppUser manager = getCurrentUser();

        return teams.findByManager(manager)
                .stream()
                .map(team -> new TeamWorkloadResponse(
                        team.getId(),
                        team.getName(),
                        team.getMembers().stream()
                                .map(this::toWorkload)
                                .toList()
                ))
                .toList();
    }

    private MemberWorkloadResponse toWorkload(AppUser member) {
        long openTaskCount = todos.countByUserAndCompletedAndAssignedByIsNotNull(member, false);
        long pendingApprovalCount = todos.countByUserAndApprovalStatus(member, ApprovalStatus.PENDING);

        return new MemberWorkloadResponse(member.getId(), member.getFullName(), member.getUsername(), openTaskCount, pendingApprovalCount);
    }

    private Team getOwnedTeam(Long teamId, AppUser manager) {
        return teams.findByIdAndManager(teamId, manager)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ekip bulunamadı"));
    }

    private TeamResponse toResponse(Team team) {
        List<UserSummaryResponse> members = team.getMembers() == null ? List.of() :
                team.getMembers().stream()
                        .map(m -> new UserSummaryResponse(m.getId(), m.getUsername(), m.getFullName()))
                        .toList();
        return new TeamResponse(team.getId(), team.getName(), members);
    }

    private AppUser getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        return users.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
