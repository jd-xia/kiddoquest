package com.kiddoquest.farm.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.farm.domain.ClubMember;

public interface ClubMemberRepository extends JpaRepository<ClubMember, String> {

    List<ClubMember> findByClubIdOrderBySlotAsc(String clubId);

    long countByClubId(String clubId);
}
