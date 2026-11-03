package com.kiddoquest.farm.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.kiddoquest.farm.domain.Club;

public interface ClubRepository extends JpaRepository<Club, String> {

    Optional<Club> findByNameKey(String nameKey);

    boolean existsByNameKey(String nameKey);

    @Query("select c from Club c where c.nameKey like :pattern order by c.nameKey")
    List<Club> search(@Param("pattern") String pattern, Pageable page);
}
