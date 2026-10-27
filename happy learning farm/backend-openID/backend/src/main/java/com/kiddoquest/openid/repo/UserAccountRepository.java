package com.kiddoquest.openid.repo;

import org.springframework.data.jpa.repository.JpaRepository;

import com.kiddoquest.openid.domain.UserAccount;

public interface UserAccountRepository extends JpaRepository<UserAccount, String> {
}
