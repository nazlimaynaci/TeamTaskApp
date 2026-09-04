package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.MyProfileResponse;
import com.nazlim.test2todolist.dto.UserSummaryResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository users;

    public UserServiceImpl(UserRepository users) {
        this.users = users;
    }

    @Override
    public List<UserSummaryResponse> getWorkers() {
        return users.findByRole(Role.WORKER)
                .stream()
                .map(u -> new UserSummaryResponse(u.getId(), u.getUsername(), u.getFullName()))
                .toList();
    }

    @Override
    public List<UserSummaryResponse> getUnassignedWorkers() {
        return users.findByRoleAndTeamIsNull(Role.WORKER)
                .stream()
                .map(u -> new UserSummaryResponse(u.getId(), u.getUsername(), u.getFullName()))
                .toList();
    }

    @Override
    public MyProfileResponse getMyProfile() {
        AppUser user = getCurrentUser();
        return new MyProfileResponse(user.getFullName(), user.getUsername(), user.getRole().name(), user.getCompany(), user.getPosition());
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
