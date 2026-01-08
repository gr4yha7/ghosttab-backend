#[test_only]
module tab_manager::tab_manager_test {
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;
    use tab_manager::tab_manager;

    // Test constants
    const DEPLOYER_ADDR: address = @0x100;
    const CREATOR_ADDR: address = @0x200;
    const SETTLER_ADDR: address = @0x300;
    const MEMBER1_ADDR: address = @0x400;
    const MEMBER2_ADDR: address = @0x500;
    const MEMBER3_ADDR: address = @0x600;

    // Error codes for testing
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_PERIOD: u64 = 2;
    const E_TAB_NOT_FOUND: u64 = 3;
    const E_MEMBER_NOT_FOUND: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;
    const E_ALREADY_SETTLED: u64 = 6;
    const E_DUPLICATE_WALLET: u64 = 8;
    const E_AMOUNT_MISMATCH: u64 = 11;

    // Helper function to setup test environment
    fun setup_test(): (signer, signer, signer, signer, signer, signer) {
        // Create framework account and initialize
        let framework = account::create_account_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&framework);
        
        // Initialize AptosCoin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&framework);
        
        let deployer = account::create_account_for_test(DEPLOYER_ADDR);
        let creator = account::create_account_for_test(CREATOR_ADDR);
        let settler = account::create_account_for_test(SETTLER_ADDR);
        let member1 = account::create_account_for_test(MEMBER1_ADDR);
        let member2 = account::create_account_for_test(MEMBER2_ADDR);
        let member3 = account::create_account_for_test(MEMBER3_ADDR);

        // Register and mint coins to members
        coin::register<AptosCoin>(&member1);
        coin::register<AptosCoin>(&member2);
        coin::register<AptosCoin>(&member3);
        coin::register<AptosCoin>(&settler);
        
        let coins1 = coin::mint(10000000, &mint_cap);
        let coins2 = coin::mint(10000000, &mint_cap);
        let coins3 = coin::mint(10000000, &mint_cap);
        
        coin::deposit(MEMBER1_ADDR, coins1);
        coin::deposit(MEMBER2_ADDR, coins2);
        coin::deposit(MEMBER3_ADDR, coins3);
        
        // Destroy capabilities
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        (deployer, creator, settler, member1, member2, member3)
    }

    fun initialize_registry(deployer: &signer, creator_addr: address) {
        tab_manager::initialize(
            deployer,
            creator_addr,
            string::utf8(b"AptosCoin")
        );
    }

    #[test]
    fun test_initialize_contract() {
        let (deployer, _creator, _settler, _member1, _member2, _member3) = setup_test();
        
        initialize_registry(&deployer, CREATOR_ADDR);
        
        // Test that we can create a tab after initialization
        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let creator = account::create_account_for_test(CREATOR_ADDR);
        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Test Tab"),
            string::utf8(b"Testing all view functions"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_test"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        // Test all view functions
        let description = tab_manager::get_tab_description(DEPLOYER_ADDR, 1);
        assert!(description == string::utf8(b"Testing all view functions"), 0);

        let deadline = tab_manager::get_tab_settlement_deadline(DEPLOYER_ADDR, 1);
        assert!(deadline == settlement_deadline, 1);

        let penalty_rate = tab_manager::get_tab_penalty_rate(DEPLOYER_ADDR, 1);
        assert!(penalty_rate == 100, 2);

        let category = tab_manager::get_tab_category(DEPLOYER_ADDR, 1);
        assert!(category == string::utf8(b"Dining"), 3);

        let stream_id = tab_manager::get_tab_stream_channel_id(DEPLOYER_ADDR, 1);
        assert!(stream_id == string::utf8(b"stream_channel_test"), 4);
    }

    #[test]
    fun test_create_tab_success() {
        let (deployer, creator, _settler, _member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);
        vector::push_back(&mut member_wallets, MEMBER2_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);
        vector::push_back(&mut member_amounts, 3000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_2"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Group dinner at restaurant"),
            8000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        let _tab = tab_manager::get_tab_by_id(DEPLOYER_ADDR, 1);
        assert!(tab_manager::get_tab_status_by_id(DEPLOYER_ADDR, 1) == string::utf8(b"opened"), 0);
        assert!(tab_manager::get_tab_total_amount_by_id(DEPLOYER_ADDR, 1) == 8000000, 1);
        assert!(tab_manager::get_tab_description(DEPLOYER_ADDR, 1) == string::utf8(b"Group dinner at restaurant"), 2);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_create_tab_unauthorized() {
        let (deployer, _creator, _settler, member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &member1,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );
    }

    #[test]
    #[expected_failure(abort_code = 11)]
    fun test_create_tab_amount_mismatch() {
        let (deployer, creator, _settler, _member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);
        vector::push_back(&mut member_wallets, MEMBER2_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);
        vector::push_back(&mut member_amounts, 2000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_2"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            10000000, // total expected amount
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );
    }

    #[test]
    #[expected_failure(abort_code = 8)]
    fun test_create_tab_duplicate_wallet() {
        let (deployer, creator, _settler, _member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);
        vector::push_back(&mut member_amounts, 3000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            8000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );
    }

    #[test]
    fun test_manual_settlement() {
        let (deployer, creator, _settler, member1, member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);
        vector::push_back(&mut member_wallets, MEMBER2_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);
        vector::push_back(&mut member_amounts, 3000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_2"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            8000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        tab_manager::settle_tab<AptosCoin>(
            &member1,
            DEPLOYER_ADDR,
            1,
            5000000,
        );

        let status = tab_manager::get_tab_member_status(DEPLOYER_ADDR, 1, MEMBER1_ADDR);
        assert!(status == string::utf8(b"settled"), 0);
        assert!(tab_manager::get_tab_status_by_id(DEPLOYER_ADDR, 1) == string::utf8(b"opened"), 1);

        // Verify member details
        let amount_paid = tab_manager::get_tab_member_amount_paid(DEPLOYER_ADDR, 1, MEMBER1_ADDR);
        let penalty = tab_manager::get_tab_member_penalty_amount(DEPLOYER_ADDR, 1, MEMBER1_ADDR);
        assert!(amount_paid == 5000000, 2);
        assert!(penalty == 0, 3);

        tab_manager::settle_tab<AptosCoin>(
            &member2,
            DEPLOYER_ADDR,
            1,
            3000000,
        );

        let status2 = tab_manager::get_tab_member_status(DEPLOYER_ADDR, 1, MEMBER2_ADDR);
        assert!(status2 == string::utf8(b"settled"), 4);
        assert!(tab_manager::get_tab_status_by_id(DEPLOYER_ADDR, 1) == string::utf8(b"closed"), 5);
    }

    #[test]
    fun test_settlement_with_penalty() {
        let (deployer, creator, _settler, member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 86400; // 1 day

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100, // 1% per day penalty
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        // Fast forward time past deadline (2 days late)
        timestamp::fast_forward_seconds(259200); // 3 days total

        // Settle with penalty
        tab_manager::settle_tab<AptosCoin>(
            &member1,
            DEPLOYER_ADDR,
            1,
            5000000,
        );

        // Verify penalty was applied
        let amount_paid = tab_manager::get_tab_member_amount_paid(DEPLOYER_ADDR, 1, MEMBER1_ADDR);
        let penalty = tab_manager::get_tab_member_penalty_amount(DEPLOYER_ADDR, 1, MEMBER1_ADDR);
        assert!(amount_paid == 5000000, 0);
        assert!(penalty > 0, 1); // Should have penalty for being 2 days late
    }

    #[test]
    #[expected_failure(abort_code = 5)]
    fun test_settle_wrong_amount() {
        let (deployer, creator, _settler, member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        tab_manager::settle_tab<AptosCoin>(
            &member1,
            DEPLOYER_ADDR,
            1,
            3000000,
        );
    }

    #[test]
    #[expected_failure(abort_code = 6)]
    fun test_settle_already_settled() {
        let (deployer, creator, _settler, member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Dinner Tab"),
            string::utf8(b"Test"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        tab_manager::settle_tab<AptosCoin>(
            &member1,
            DEPLOYER_ADDR,
            1,
            5000000,
        );

        tab_manager::settle_tab<AptosCoin>(
            &member1,
            DEPLOYER_ADDR,
            1,
            5000000,
        );
    }

    #[test]
    fun test_get_tabs_by_creator() {
        let (deployer, creator, _settler, _member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER1_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_1"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Tab 1"),
            string::utf8(b"Test 1"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Tab 2"),
            string::utf8(b"Test 2"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_2"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        let tabs = tab_manager::get_tabs_by_creator(DEPLOYER_ADDR, CREATOR_ADDR);
        assert!(vector::length(&tabs) == 2, 0);
    }

    #[test]
    fun test_get_tabs_by_member() {
        let (deployer, creator, _settler, _member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        let member_wallets1 = vector::empty<address>();
        vector::push_back(&mut member_wallets1, MEMBER1_ADDR);

        let member_amounts1 = vector::empty<u64>();
        vector::push_back(&mut member_amounts1, 5000000);

        let member_privy_ids1 = vector::empty<String>();
        vector::push_back(&mut member_privy_ids1, string::utf8(b"privy_id_1"));

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Tab 1"),
            string::utf8(b"Test 1"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids1,
            member_wallets1,
            member_amounts1,
        );

        let member_wallets2 = vector::empty<address>();
        vector::push_back(&mut member_wallets2, MEMBER2_ADDR);

        let member_amounts2 = vector::empty<u64>();
        vector::push_back(&mut member_amounts2, 3000000);

        let member_privy_ids2 = vector::empty<String>();
        vector::push_back(&mut member_privy_ids2, string::utf8(b"privy_id_2"));

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Tab 2"),
            string::utf8(b"Test 2"),
            3000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_2"),
            member_privy_ids2,
            member_wallets2,
            member_amounts2,
        );

        let member_wallets3 = vector::empty<address>();
        vector::push_back(&mut member_wallets3, MEMBER1_ADDR);
        vector::push_back(&mut member_wallets3, MEMBER2_ADDR);

        let member_amounts3 = vector::empty<u64>();
        vector::push_back(&mut member_amounts3, 4000000);
        vector::push_back(&mut member_amounts3, 4000000);

        let member_privy_ids3 = vector::empty<String>();
        vector::push_back(&mut member_privy_ids3, string::utf8(b"privy_id_1"));
        vector::push_back(&mut member_privy_ids3, string::utf8(b"privy_id_2"));

        tab_manager::create_tab(
            &creator,
            DEPLOYER_ADDR,
            string::utf8(b"Tab 3"),
            string::utf8(b"Test 3"),
            8000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_3"),
            member_privy_ids3,
            member_wallets3,
            member_amounts3,
        );

        let tabs_member1 = tab_manager::get_tabs_by_member(DEPLOYER_ADDR, MEMBER1_ADDR);
        assert!(vector::length(&tabs_member1) == 2, 0);

        let tabs_member2 = tab_manager::get_tabs_by_member(DEPLOYER_ADDR, MEMBER2_ADDR);
        assert!(vector::length(&tabs_member2) == 2, 1);
    }

    #[test]
    fun test_update_authorized_creator() {
        let (deployer, _creator, _settler, member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        tab_manager::update_authorized_creator(
            &deployer,
            DEPLOYER_ADDR,
            MEMBER1_ADDR
        );

        let member_wallets = vector::empty<address>();
        vector::push_back(&mut member_wallets, MEMBER2_ADDR);

        let member_amounts = vector::empty<u64>();
        vector::push_back(&mut member_amounts, 5000000);

        let member_privy_ids = vector::empty<String>();
        vector::push_back(&mut member_privy_ids, string::utf8(b"privy_id_2"));

        let current_time = timestamp::now_seconds();
        let settlement_deadline = current_time + 604800;

        tab_manager::create_tab(
            &member1,
            DEPLOYER_ADDR,
            string::utf8(b"New Tab"),
            string::utf8(b"Test"),
            5000000,
            SETTLER_ADDR,
            string::utf8(b"group_123"),
            settlement_deadline,
            100,
            string::utf8(b"Dining"),
            string::utf8(b"stream_channel_1"),
            member_privy_ids,
            member_wallets,
            member_amounts,
        );

        let _tab = tab_manager::get_tab_by_id(DEPLOYER_ADDR, 1);
    }

    #[test]
    fun test_multiple_auto_settlement_updates() {
        let (deployer, _creator, _settler, member1, _member2, _member3) = setup_test();
        initialize_registry(&deployer, CREATOR_ADDR);

        tab_manager::configure_auto_settlement(
            &member1,
            DEPLOYER_ADDR,
            10000000,
            1000000,
            true,
        );

        tab_manager::configure_auto_settlement(
            &member1,
            DEPLOYER_ADDR,
            15000000,
            500000,
            false,
        );

        let _auto_settlement = tab_manager::get_auto_settlement(DEPLOYER_ADDR, MEMBER1_ADDR);
    }

}