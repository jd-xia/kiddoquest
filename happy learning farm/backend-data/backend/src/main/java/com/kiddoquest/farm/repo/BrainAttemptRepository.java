package com.kiddoquest.farm.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.BrainAttempt;

public interface BrainAttemptRepository extends JpaRepository<BrainAttempt, String> {

    void deleteByChildId(String childId);
}
