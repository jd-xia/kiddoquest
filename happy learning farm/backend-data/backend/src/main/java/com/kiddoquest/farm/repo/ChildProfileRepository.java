package com.kiddoquest.farm.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kiddoquest.farm.domain.ChildProfile;

import jakarta.persistence.LockModeType;

public interface ChildProfileRepository extends JpaRepository<ChildProfile, String> {

    List<ChildProfile> findByOwnerUserIdOrderByCreatedAtAsc(String ownerUserId);

    long countByOwnerUserId(String ownerUserId);

    Optional<ChildProfile> findByIdAndOwnerUserId(String id, String ownerUserId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ChildProfile c where c.id = :id and c.ownerUserId = :owner")
    Optional<ChildProfile> lockByIdAndOwner(@Param("id") String id, @Param("owner") String owner);
}
