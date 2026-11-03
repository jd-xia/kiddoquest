package com.kiddoquest.farm.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.BrainProfile;

public interface BrainProfileRepository extends JpaRepository<BrainProfile, String> {
}
