package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.dto.MyProfileResponse;
import com.nazlim.test2todolist.dto.UserSummaryResponse;

import java.util.List;

public interface UserService {
    List<UserSummaryResponse> getWorkers();
    MyProfileResponse getMyProfile();
}
