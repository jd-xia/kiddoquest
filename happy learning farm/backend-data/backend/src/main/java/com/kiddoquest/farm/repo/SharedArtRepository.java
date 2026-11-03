package com.kiddoquest.farm.repo;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kiddoquest.farm.domain.SharedArt;

public interface SharedArtRepository extends JpaRepository<SharedArt, String> {

    @Query("select a from SharedArt a where a.itemKey = :key order by a.createdAt desc")
    List<SharedArt> latest(@Param("key") String key, Pageable page);

    long countByChildId(String childId);

    List<SharedArt> findByChildId(String childId);
}
