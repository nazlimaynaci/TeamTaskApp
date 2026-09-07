package com.nazlim.test2todolist.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

// Geçici: ddl-auto=update production'da todos tablosuna created_at/completed_at
// sütunlarını eklemediği için bir kerelik manuel migrasyon. Çalıştırıldıktan sonra silinecek.
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('MANAGER')")
public class AdminController {

    private final DataSource dataSource;

    public AdminController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @PostMapping("/migrate-todo-columns")
    public List<String> migrate() throws Exception {
        List<String> log = new ArrayList<>();

        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {

            st.executeUpdate("ALTER TABLE todos ADD COLUMN IF NOT EXISTS created_at timestamptz");
            log.add("added/verified created_at");

            st.executeUpdate("ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_at timestamptz");
            log.add("added/verified completed_at");

            st.executeUpdate("UPDATE todos SET created_at = now() WHERE created_at IS NULL");
            log.add("backfilled created_at for existing rows");

            st.executeUpdate("ALTER TABLE todos ALTER COLUMN created_at SET NOT NULL");
            log.add("set created_at NOT NULL");

            try (ResultSet rs = st.executeQuery(
                    "select column_name, data_type, is_nullable from information_schema.columns where table_name = 'todos' order by ordinal_position")) {
                while (rs.next()) {
                    log.add(rs.getString(1) + " (" + rs.getString(2) + ", nullable=" + rs.getString(3) + ")");
                }
            }
        }

        return log;
    }
}
