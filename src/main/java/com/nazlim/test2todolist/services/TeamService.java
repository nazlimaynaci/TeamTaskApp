package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.dto.MyTeamResponse;
import com.nazlim.test2todolist.dto.TeamRequest;
import com.nazlim.test2todolist.dto.TeamResponse;
import com.nazlim.test2todolist.dto.TeamWorkloadResponse;
import com.nazlim.test2todolist.dto.UserSummaryResponse;

import java.util.List;

public interface TeamService {
    TeamResponse createTeam(TeamRequest request);
    List<TeamResponse> getMyTeams();
    TeamResponse addMember(Long teamId, Long workerId);
    TeamResponse removeMember(Long teamId, Long workerId);
    void deleteTeam(Long teamId);
    MyTeamResponse getMyTeam();
    List<UserSummaryResponse> getMyTeammates();
    List<TeamWorkloadResponse> getMyTeamsWorkload();
}
