package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.UserSummaryResponse;
import com.nazlim.test2todolist.entity.Role;
import org.springframework.stereotype.Service;

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
}
