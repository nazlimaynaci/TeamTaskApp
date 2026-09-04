package com.nazlim.test2todolist.auth;

import com.nazlim.test2todolist.dto.LoginRequest;
import com.nazlim.test2todolist.dto.RegisterRequest;
import com.nazlim.test2todolist.dto.AuthResponse;
import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.InviteCode;
import com.nazlim.test2todolist.entity.Role;
import com.nazlim.test2todolist.repository.InviteCodeRepository;
import com.nazlim.test2todolist.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository users;
    private final JwtService jwt;
    private final PasswordEncoder encoder;
    private final InviteCodeRepository inviteCodes;

    // Sabit "ana kod" - ilk kurulum / yeni ortam bootstrap'i için (henüz hiçbir yönetici
    // yokken tek kullanımlık kod üretecek kimse de yok). Normal akışta yöneticiler
    // birbirine tek kullanımlık kod üretip (bkz. InviteCodeService) onu paylaşır.
    @Value("${manager.invite-code}")
    private String managerInviteCode;

    public AuthService(UserRepository users, JwtService jwt, PasswordEncoder encoder, InviteCodeRepository inviteCodes) {
        this.users = users;
        this.jwt = jwt;
        this.encoder = encoder;
        this.inviteCodes = inviteCodes;
    }

    public void register(RegisterRequest req) {
        if (users.existsByUsername(req.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        if (!req.acceptedTerms()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kullanım şartlarını kabul etmelisin");
        }

        Role role = Role.valueOf(req.role());
        InviteCode consumedInvite = null;

        if (role == Role.MANAGER) {
            if (!StringUtils.hasText(req.phone())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Telefon numarası yönetici kaydı için zorunlu");
            }
            if (!StringUtils.hasText(req.company())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Şirket/Departman adı zorunlu");
            }

            boolean isMasterCode = managerInviteCode.equals(req.inviteCode());
            if (!isMasterCode) {
                consumedInvite = inviteCodes.findByCodeAndUsedFalse(req.inviteCode())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Geçersiz davet kodu"));
            }
        }

        AppUser user = new AppUser();
        user.setUsername(req.username());
        user.setPassword(encoder.encode(req.password()));
        user.setRole(role);
        user.setFullName(req.fullName());
        user.setEmail(req.email());
        user.setPhone(req.phone());
        user.setCompany(req.company());
        user.setPosition(req.position());

        AppUser saved = users.save(user);

        if (consumedInvite != null) {
            consumedInvite.setUsed(true);
            consumedInvite.setUsedBy(saved);
            inviteCodes.save(consumedInvite);
        }
    }

    public AuthResponse login(LoginRequest req) {
        AppUser user = users.findByUsername(req.username())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!encoder.matches(req.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwt.generateToken(user.getUsername());
        return new AuthResponse("Giriş yapıldı", token, user.getRole().name()); // ✅ token ve rol burada
    }
}