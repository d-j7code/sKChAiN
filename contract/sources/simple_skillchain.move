module skillchain_addr::simple_skillchain {
    use std::signer;
    use std::string::String;
    use aptos_std::table::{Self, Table};

    struct SimpleSystem has key {
        skills: Table<u64, Skill>,
        next_id: u64,
    }

    struct Skill has store {
        owner: address,
        name: String,
        is_verified: bool,
    }

    fun init_module(account: &signer) {
        let system = SimpleSystem {
            skills: table::new(),
            next_id: 1,
        };
        move_to(account, system);
    }

    public entry fun mint_skill(
        user: &signer,
        name: String,
    ) acquires SimpleSystem {
        let user_addr = signer::address_of(user);
        let system = borrow_global_mut<SimpleSystem>(@skillchain_addr);
        let skill_id = system.next_id;
        
        let skill = Skill {
            owner: user_addr,
            name,
            is_verified: false,
        };
        
        table::add(&mut system.skills, skill_id, skill);
        system.next_id = skill_id + 1;
    }

    #[view]
    public fun get_skill(skill_id: u64): (String, bool, address) acquires SimpleSystem {
        let system = borrow_global<SimpleSystem>(@skillchain_addr);
        let skill = table::borrow(&system.skills, skill_id);
        (skill.name, skill.is_verified, skill.owner)
    }
}