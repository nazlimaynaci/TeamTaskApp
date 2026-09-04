package com.nazlim.test2todolist.services;

import com.nazlim.test2todolist.auth.UserRepository;
import com.nazlim.test2todolist.dto.InviteCodeResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.InviteCode;
import com.nazlim.test2todolist.repository.InviteCodeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;

@Service
public class InviteCodeServiceImpl implements InviteCodeService {

    // 0/O/1/I gibi birbirine karışabilecek karakterler bilerek çıkarıldı -
    // kodu telefonda/elle okuyup yazan biri için daha az hataya açık.
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final InviteCodeRepository invites;
    private final UserRepository users;

    public InviteCodeServiceImpl(InviteCodeRepository invites, UserRepository users) {
        this.invites = invites;
        this.users = users;
    }

    @Override
    public InviteCodeResponse generate() {
        AppUser manager = getCurrentUser();

        InviteCode invite = new InviteCode();
        invite.setCode(generateUniqueCode());
        invite.setCreatedBy(manager);

        return toResponse(invites.save(invite));
    }

    @Override
    public List<InviteCodeResponse> getMine() {
        AppUser manager = getCurrentUser();

        return invites.findByCreatedByOrderByCreatedAtDesc(manager)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private String generateUniqueCode() {
        String code;
        do {
            code = randomCode();
        } while (invites.findByCodeAndUsedFalse(code).isPresent());
        return code;
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    private InviteCodeResponse toResponse(InviteCode invite) {
        String usedByFullName = invite.getUsedBy() != null ? invite.getUsedBy().getFullName() : null;
        return new InviteCodeResponse(invite.getId(), invite.getCode(), invite.isUsed(), usedByFullName, invite.getCreatedAt());
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
