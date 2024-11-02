module skill_token::skill_token {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_framework::timestamp;
    
    struct SkillToken has store, drop {
        skill_name: String,
        skill_level: u64,
        owner: address,
        created_at: u64,
        updated_at: u64,
        endorsements: u64,
    }

    struct TokenStorage has key {
        tokens: Table<u64, SkillToken>,
        token_count: u64,
        user_tokens: Table<address, vector<u64>>, // Track tokens owned by each user
    }

    // Events
    struct SkillTokenEvents has key {
        mint_events: Table<u64, bool>,
        transfer_events: Table<u64, bool>,
        endorsement_events: Table<u64, bool>,
    }

    const E_NOT_OWNER: u64 = 1;
    const E_TOKEN_STORAGE_NOT_FOUND: u64 = 2;
    const E_TOKEN_NOT_FOUND: u64 = 3;
    const E_CANNOT_ENDORSE_OWN_TOKEN: u64 = 4;
    const E_TOKEN_NOT_IN_USER_TOKENS: u64 = 5;

    public entry fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        if (!exists<TokenStorage>(account_addr)) {
            move_to(account, TokenStorage {
                tokens: table::new(),
                token_count: 0,
                user_tokens: table::new(),
            });
            move_to(account, SkillTokenEvents {
                mint_events: table::new(),
                transfer_events: table::new(),
                endorsement_events: table::new(),
            });
        };
    }

    public entry fun mint_skill_token(
        account: &signer,
        skill_name: String,
        skill_level: u64
    ) acquires TokenStorage {
        let account_addr = signer::address_of(account);
        
        if (!exists<TokenStorage>(account_addr)) {
            initialize(account);
        };

        let token_storage = borrow_global_mut<TokenStorage>(account_addr);
        let token_id = token_storage.token_count + 1;
        let current_time = timestamp::now_microseconds();
        
        let new_token = SkillToken {
            skill_name,
            skill_level,
            owner: account_addr,
            created_at: current_time,
            updated_at: current_time,
            endorsements: 0,
        };
        
        table::add(&mut token_storage.tokens, token_id, new_token);
        token_storage.token_count = token_id;

        // Add token to user's tokens list
        if (!table::contains(&token_storage.user_tokens, account_addr)) {
            table::add(&mut token_storage.user_tokens, account_addr, vector::empty());
        };
        let user_tokens = table::borrow_mut(&mut token_storage.user_tokens, account_addr);
        vector::push_back(user_tokens, token_id);
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
        
        // Update token ownership
        token.owner = to;
        token.updated_at = timestamp::now_microseconds();

        // Update user_tokens tracking
        let from_tokens = table::borrow_mut(&mut token_storage.user_tokens, from_addr);
        let (found, index) = vector::index_of(from_tokens, &token_id);
        assert!(found, E_TOKEN_NOT_IN_USER_TOKENS);
        vector::remove(from_tokens, index);

        if (!table::contains(&token_storage.user_tokens, to)) {
            table::add(&mut token_storage.user_tokens, to, vector::empty());
        };
        let to_tokens = table::borrow_mut(&mut token_storage.user_tokens, to);
        vector::push_back(to_tokens, token_id);
    }

    public entry fun endorse_skill(
        endorser: &signer,
        token_id: u64
    ) acquires TokenStorage {
        let endorser_addr = signer::address_of(endorser);
        let token_storage = borrow_global_mut<TokenStorage>(endorser_addr);
        
        let token = table::borrow_mut(&mut token_storage.tokens, token_id);
        assert!(token.owner != endorser_addr, E_CANNOT_ENDORSE_OWN_TOKEN);
        
        token.endorsements = token.endorsements + 1;
        token.updated_at = timestamp::now_microseconds();
    }

    #[view]
    public fun get_token_count(account: address): u64 acquires TokenStorage {
        assert!(exists<TokenStorage>(account), E_TOKEN_STORAGE_NOT_FOUND);
        let token_storage = borrow_global<TokenStorage>(account);
        token_storage.token_count
    }

    #[view]
    public fun get_user_tokens(account: address): vector<u64> acquires TokenStorage {
        assert!(exists<TokenStorage>(account), E_TOKEN_STORAGE_NOT_FOUND);
        let token_storage = borrow_global<TokenStorage>(account);
        *table::borrow(&token_storage.user_tokens, account)
    }
}