package com.nazlim.test2todolist.repository;

import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByManager(AppUser manager);
    Optional<Team> findByIdAndManager(Long id, AppUser manager);
}
