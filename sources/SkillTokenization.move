module skill_token::skill_token {
    use std::string::String;
    use std::signer;
    use aptos_std::table::{Self, Table};
    
    struct SkillToken has store, drop {
        skill_name: String,
        skill_level: u64,
        owner: address,
    }

    struct TokenStorage has key {
        tokens: Table<u64, SkillToken>,
        token_count: u64
    }

    const E_NOT_OWNER: u64 = 1;
    const E_TOKEN_STORAGE_NOT_FOUND: u64 = 2;

    public entry fun mint_skill_token(
        account: &signer,
        skill_name: String,
        skill_level: u64
    ) acquires TokenStorage {
        let account_addr = signer::address_of(account);
        
        if (!exists<TokenStorage>(account_addr)) {
            move_to(account, TokenStorage {
                tokens: table::new(),
                token_count: 0
            });
        };

        let token_storage = borrow_global_mut<TokenStorage>(account_addr);
        let token_id = token_storage.token_count + 1;
        
        let new_token = SkillToken {
            skill_name,
            skill_level,
            owner: account_addr,
        };
        
        table::add(&mut token_storage.tokens, token_id, new_token);
        token_storage.token_count = token_id;
    }

    public entry fun transfer_skill_token(
        from: &signer,
        to: address,
        token_id: u64
    ) acquires TokenStorage {
        let from_addr = signer::address_of(from);
        assert!(exists<TokenStorage>(from_addr), E_TOKEN_STORAGE_NOT_FOUND);
        
        let token_storage = borrow_global_mut<TokenStorage>(from_addr);
        let token = table::borrow_mut(&mut token_storage.tokens, token_id);
        assert!(token.owner == from_addr, E_NOT_OWNER);
        token.owner = to;
    }
}
