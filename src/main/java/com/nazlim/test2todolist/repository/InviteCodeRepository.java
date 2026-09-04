package com.nazlim.test2todolist.repository;

import com.nazlim.test2todolist.entity.AppUser;
import com.nazlim.test2todolist.entity.InviteCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {
    Optional<InviteCode> findByCodeAndUsedFalse(String code);
    List<InviteCode> findByCreatedByOrderByCreatedAtDesc(AppUser createdBy);
}
