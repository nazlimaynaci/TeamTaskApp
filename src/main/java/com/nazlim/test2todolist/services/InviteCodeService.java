package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.dto.InviteCodeResponse;

import java.util.List;

public interface InviteCodeService {
    InviteCodeResponse generate();
    List<InviteCodeResponse> getMine();
}
