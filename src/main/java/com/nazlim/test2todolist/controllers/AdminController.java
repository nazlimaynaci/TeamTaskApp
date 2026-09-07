package com.nazlim.test2todolist.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.List;

// Geçici: AppUser<->Team ilişkisi tek-ekipten çok-ekibe geçerken eski users.team_id
// sütunundaki mevcut üyelikleri yeni team_members join tablosuna bir kerelik taşır.
// Çalıştırıldıktan sonra silinecek.
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('MANAGER')")
public class AdminController {

    private final DataSource dataSource;

    public AdminController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostMapping("/migrate-team-memberships")
    public List<String> migrate() throws Exception {
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {

            int inserted = st.executeUpdate(
                    "INSERT INTO team_members (user_id, team_id) " +
                    "SELECT id, team_id FROM users WHERE team_id IS NOT NULL " +
                    "ON CONFLICT DO NOTHING");

            return List.of("migrated rows: " + inserted);
        }
    }
}
