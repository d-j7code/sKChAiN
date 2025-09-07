module skillchain_addr::skillchain {
    use std::signer;
    use std::string::String;
    use aptos_std::table::{Self, Table};

    struct SkillChainSystem has key {
        skills: Table<u64, Skill>,
        next_skill_id: u64,
    }

    struct Skill has store {
        owner: address,
        name: String,
        description: String,
        evidence_url: String,
        is_verified: bool,
    }

    fun init_module(account: &signer) {
        let system = SkillChainSystem {
            skills: table::new(),
            next_skill_id: 1,
        };
        move_to(account, system);
    }

    public entry fun mint_skill(
        user: &signer,
        name: String,
        description: String,
        evidence_url: String,
    ) acquires SkillChainSystem {
        let user_addr = signer::address_of(user);
        let system = borrow_global_mut<SkillChainSystem>(@skillchain_addr);
        let skill_id = system.next_skill_id;
        
        let skill = Skill {
            owner: user_addr,
            name,
            description,
            evidence_url,
            is_verified: false,
        };
        
        table::add(&mut system.skills, skill_id, skill);
        system.next_skill_id = skill_id + 1;
    }

    #[view]
    public fun get_skill(skill_id: u64): (String, String, String, bool, address) acquires SkillChainSystem {
        let system = borrow_global<SkillChainSystem>(@skillchain_addr);
        let skill = table::borrow(&system.skills, skill_id);
        (skill.name, skill.description, skill.evidence_url, skill.is_verified, skill.owner)
    }

    #[view]
    public fun get_next_ids(): (u64) acquires SkillChainSystem {
        let system = borrow_global<SkillChainSystem>(@skillchain_addr);
        system.next_skill_id
    }

    public entry fun validate_skill(
        validator: &signer,
        skill_id: u64,
    ) acquires SkillChainSystem {
        let validator_addr = signer::address_of(validator);
        let system = borrow_global_mut<SkillChainSystem>(@skillchain_addr);
        let skill = table::borrow_mut(&mut system.skills, skill_id);
        
        // Prevent self-validation
        assert!(skill.owner != validator_addr, 1);
        
        // Mark skill as verified
        skill.is_verified = true;
    }
}