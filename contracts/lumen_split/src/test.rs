#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Address, Env};

#[test]
fn test_create_group() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);

    let members = vec![&env, member1.clone(), member2.clone()];
    let group_name = String::from_str(&env, "Pizza Night");

    env.mock_all_auths();

    // Register users
    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));
    client.register(&member2, &String::from_str(&env, "Member 2"));

    let group_id = client.create_group(&creator, &group_name, &members);
    assert_eq!(group_id, 1);

    let group = client.get_group(&group_id);
    assert_eq!(group.name, group_name);
    assert!(group.members.contains(&creator));
    assert!(group.members.contains(&member1));
    assert!(group.members.contains(&member2));

    assert_eq!(client.get_balance(&group_id, &creator), 0);
    assert_eq!(client.get_balance(&group_id, &member1), 0);
}

#[test]
fn test_add_expense_equal_split() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);

    let members = vec![&env, member1.clone(), member2.clone()];

    env.mock_all_auths();

    // Register users
    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));
    client.register(&member2, &String::from_str(&env, "Member 2"));

    let group_id = client.create_group(&creator, &String::from_str(&env, "Trip"), &members);

    let participants = vec![&env, creator.clone(), member1.clone(), member2.clone()];
    client.add_expense(&creator, &group_id, &300, &participants);

    assert_eq!(client.get_balance(&group_id, &creator), 200);
    assert_eq!(client.get_balance(&group_id, &member1), -100);
    assert_eq!(client.get_balance(&group_id, &member2), -100);
}

#[test]
fn test_settle_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);

    env.mock_all_auths();

    // Register users
    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));

    let group_id = client.create_group(
        &creator,
        &String::from_str(&env, "Settlement Test"),
        &vec![&env, member1.clone()],
    );

    client.add_expense(
        &creator,
        &group_id,
        &100,
        &vec![&env, creator.clone(), member1.clone()],
    );

    assert_eq!(client.get_balance(&group_id, &creator), 50);
    assert_eq!(client.get_balance(&group_id, &member1), -50);

    client.settle_debt(&member1, &group_id, &creator, &50);

    assert_eq!(client.get_balance(&group_id, &creator), 0);
    assert_eq!(client.get_balance(&group_id, &member1), 0);
}

#[test]
fn test_add_expense_non_member() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let non_member = Address::generate(&env);

    env.mock_all_auths();

    // Register users
    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&non_member, &String::from_str(&env, "Non Member"));

    let group_id = client.create_group(&creator, &String::from_str(&env, "Test"), &vec![&env]);

    let result = client.try_add_expense(&non_member, &group_id, &100, &vec![&env, creator.clone()]);
    assert_eq!(result, Err(Ok(Error::NotAMember)));
}

#[test]
fn test_add_member() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);

    env.mock_all_auths();

    // Register users
    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));
    client.register(&member2, &String::from_str(&env, "Member 2"));

    let group_id = client.create_group(
        &creator,
        &String::from_str(&env, "Add Member"),
        &vec![&env, member1.clone()],
    );

    client.add_member(&creator, &group_id, &member2);

    let group = client.get_group(&group_id);
    assert!(group.members.contains(&creator));
    assert!(group.members.contains(&member1));
    assert!(group.members.contains(&member2));
    assert_eq!(client.get_balance(&group_id, &member2), 0);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #3)")]
fn test_settle_debt_safety_over_settle() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);

    env.mock_all_auths();

    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));

    let group_id = client.create_group(
        &creator,
        &String::from_str(&env, "Safety Test"),
        &vec![&env, member1.clone()],
    );

    client.add_expense(
        &creator,
        &group_id,
        &100,
        &vec![&env, creator.clone(), member1.clone()],
    );

    // member1 owes 50. Trying to settle 60 should fail.
    client.settle_debt(&member1, &group_id, &creator, &60);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #3)")]
fn test_settle_debt_safety_no_debt() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);

    env.mock_all_auths();

    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));

    let group_id = client.create_group(
        &creator,
        &String::from_str(&env, "Safety Test 2"),
        &vec![&env, member1.clone()],
    );

    // member1 has 0 balance. Trying to settle should fail.
    client.settle_debt(&member1, &group_id, &creator, &10);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #6)")]
fn test_create_group_unregistered_member() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);

    env.mock_all_auths();

    client.register(&creator, &String::from_str(&env, "Creator"));
    // member1 is NOT registered

    client.create_group(
        &creator,
        &String::from_str(&env, "Bad Group"),
        &vec![&env, member1.clone()],
    );
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #6)")]
fn test_add_unregistered_member() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);

    env.mock_all_auths();

    client.register(&creator, &String::from_str(&env, "Creator"));

    let group_id =
        client.create_group(&creator, &String::from_str(&env, "Good Group"), &vec![&env]);

    // member1 is NOT registered
    client.add_member(&creator, &group_id, &member1);
}

#[test]
fn test_activity_log() {
    let env = Env::default();
    let contract_id = env.register_contract(None, LumenSplit);
    let client = LumenSplitClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let member1 = Address::generate(&env);

    env.mock_all_auths();

    client.register(&creator, &String::from_str(&env, "Creator"));
    client.register(&member1, &String::from_str(&env, "Member 1"));

    // 1. Create Group (Activity 1: MemberAdded/Created)
    let group_id = client.create_group(
        &creator,
        &String::from_str(&env, "Activity Test"),
        &vec![&env, member1.clone()],
    );

    let activities = client.get_activities(&group_id);
    assert_eq!(activities.len(), 1);
    let a1 = activities.get(0).unwrap();
    assert_eq!(a1.id, 1);
    assert_eq!(a1.actor, creator);
    assert_eq!(a1.amount, 0);

    // 2. Add Expense (Activity 2: Expense)
    client.add_expense(
        &creator,
        &group_id,
        &100,
        &vec![&env, creator.clone(), member1.clone()],
    );

    let activities = client.get_activities(&group_id);
    assert_eq!(activities.len(), 2);
    let a2 = activities.get(1).unwrap();
    assert_eq!(a2.id, 2);
    assert_eq!(a2.kind, ActivityType::Expense);
    assert_eq!(a2.amount, 100);

    // 3. Settle Debt (Activity 3: Settlement)
    client.settle_debt(&member1, &group_id, &creator, &50);

    let activities = client.get_activities(&group_id);
    assert_eq!(activities.len(), 3);
    let a3 = activities.get(2).unwrap();
    assert_eq!(a3.id, 3);
    assert_eq!(a3.kind, ActivityType::Settlement);
    assert_eq!(a3.actor, member1);
    assert_eq!(a3.recipient, Some(creator.clone()));
    assert_eq!(a3.amount, 50);

    // 4. Add Member (Activity 4: MemberAdded)
    let member2 = Address::generate(&env);
    client.register(&member2, &String::from_str(&env, "Member 2"));
    client.add_member(&creator, &group_id, &member2);

    let activities = client.get_activities(&group_id);
    assert_eq!(activities.len(), 4);
    let a4 = activities.get(3).unwrap();
    assert_eq!(a4.id, 4);
    assert_eq!(a4.kind, ActivityType::MemberAdded);
    assert_eq!(a4.recipient, Some(member2));
}
