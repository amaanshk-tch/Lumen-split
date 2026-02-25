#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short as symbol, Address, Env,
    String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    GroupNotFound = 1,
    NotAMember = 2,
    InvalidAmount = 3,
    AlreadyMember = 4,
    NotAuthorized = 5,
    UserNotRegistered = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Group(u32),
    Balance(u32, Address),
    Counter,
    MemberGroups(Address),
    Expenses(u32),
    UserRegistration(Address),
    UserName(Address),
    Activities(u32),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ActivityType {
    Expense = 1,
    Settlement = 2,
    MemberAdded = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Activity {
    pub id: u32,
    pub kind: ActivityType,
    pub actor: Address,
    pub recipient: Option<Address>,
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Expense {
    pub payer: Address,
    pub amount: i128,
    pub participants: Vec<Address>,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Group {
    pub name: String,
    pub members: Vec<Address>,
    pub creator: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberInfo {
    pub address: Address,
    pub name: String,
    pub balance: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GroupWithBalances {
    pub name: String,
    pub members: Vec<MemberInfo>,
    pub creator: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
}
#[contract]
pub struct LumenSplit;

#[contractimpl]
impl LumenSplit {
    pub fn register(env: Env, user: Address, name: String) {
        user.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::UserRegistration(user.clone()), &true);
        env.storage()
            .persistent()
            .set(&DataKey::UserName(user.clone()), &name);

        env.events()
            .publish((symbol!("user"), symbol!("register")), (user, name));
    }

    pub fn is_registered(env: Env, user: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::UserRegistration(user))
            .unwrap_or(false)
    }

    pub fn get_user_name(env: Env, user: Address) -> String {
        env.storage()
            .persistent()
            .get(&DataKey::UserName(user))
            .unwrap_or(String::from_str(&env, "Unknown"))
    }

    pub fn create_group(
        env: Env,
        creator: Address,
        name: String,
        members: Vec<Address>,
    ) -> Result<u32, Error> {
        creator.require_auth();

        if !Self::is_registered(env.clone(), creator.clone()) {
            return Err(Error::UserNotRegistered);
        }

        for member in members.iter() {
            if !Self::is_registered(env.clone(), member.clone()) {
                return Err(Error::UserNotRegistered);
            }
        }

        let mut all_members = members.clone();
        if !all_members.contains(&creator) {
            all_members.push_back(creator.clone());
        }

        let mut counter: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        counter += 1;

        let group = Group {
            name: name.clone(),
            members: all_members.clone(),
            creator: creator.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Group(counter), &group);
        env.storage().persistent().set(&DataKey::Counter, &counter);

        for member in all_members.iter() {
            env.storage()
                .persistent()
                .set(&DataKey::Balance(counter, member.clone()), &0i128);

            // Add group to member's list
            let mut member_groups: Vec<u32> = env
                .storage()
                .persistent()
                .get(&DataKey::MemberGroups(member.clone()))
                .unwrap_or(Vec::new(&env));
            if !member_groups.contains(&counter) {
                member_groups.push_back(counter);
                env.storage()
                    .persistent()
                    .set(&DataKey::MemberGroups(member), &member_groups);
            }
        }

        Self::record_activity(
            &env,
            counter,
            ActivityType::MemberAdded, // Borrowing MemberAdded for creation for simplicity, or we could add a GroupCreated type
            creator.clone(),
            None,
            0,
        );

        env.events().publish(
            (symbol!("group"), symbol!("created")),
            (counter, name, creator),
        );

        Ok(counter)
    }

    pub fn add_expense(
        env: Env,
        payer: Address,
        group_id: u32,
        amount: i128,
        participants: Vec<Address>,
    ) -> Result<(), Error> {
        payer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)?;

        if !group.members.contains(&payer) {
            return Err(Error::NotAMember);
        }

        for p in participants.iter() {
            if !group.members.contains(&p) {
                return Err(Error::NotAMember);
            }
        }

        let num_participants = participants.len() as i128;
        if num_participants == 0 {
            return Err(Error::InvalidAmount);
        }

        let split_amount = amount / num_participants;
        let remainder = amount % num_participants;

        for (i, participant) in participants.iter().enumerate() {
            let current_balance: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(group_id, participant.clone()))
                .unwrap_or(0);

            let mut participant_share = split_amount;
            if (i as i128) < remainder {
                participant_share += 1;
            }

            if participant == payer {
                let net_lent = amount - participant_share;
                env.storage().persistent().set(
                    &DataKey::Balance(group_id, participant),
                    &(current_balance + net_lent),
                );
            } else {
                env.storage().persistent().set(
                    &DataKey::Balance(group_id, participant),
                    &(current_balance - participant_share),
                );
            }
        }

        let mut expenses: Vec<Expense> = env
            .storage()
            .persistent()
            .get(&DataKey::Expenses(group_id))
            .unwrap_or(Vec::new(&env));
        let expense = Expense {
            payer: payer.clone(),
            amount,
            participants: participants.clone(),
            timestamp: env.ledger().timestamp(),
        };
        expenses.push_back(expense);
        env.storage()
            .persistent()
            .set(&DataKey::Expenses(group_id), &expenses);

        Self::record_activity(
            &env,
            group_id,
            ActivityType::Expense,
            payer.clone(),
            None,
            amount,
        );

        env.events().publish(
            (symbol!("expense"), symbol!("added")),
            (group_id, payer, amount),
        );

        Ok(())
    }

    pub fn add_member(
        env: Env,
        actor: Address,
        group_id: u32,
        new_member: Address,
    ) -> Result<(), Error> {
        actor.require_auth();

        if !Self::is_registered(env.clone(), actor.clone()) {
            return Err(Error::UserNotRegistered);
        }

        if !Self::is_registered(env.clone(), new_member.clone()) {
            return Err(Error::UserNotRegistered);
        }

        let mut group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)?;

        if !group.members.contains(&actor) {
            return Err(Error::NotAMember);
        }

        if group.members.contains(&new_member) {
            return Err(Error::AlreadyMember);
        }

        group.members.push_back(new_member.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Group(group_id), &group);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(group_id, new_member.clone()), &0i128);

        let mut member_groups: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::MemberGroups(new_member.clone()))
            .unwrap_or(Vec::new(&env));
        if !member_groups.contains(&group_id) {
            member_groups.push_back(group_id);
            env.storage()
                .persistent()
                .set(&DataKey::MemberGroups(new_member.clone()), &member_groups);
        }

        env.events().publish(
            (symbol!("group"), symbol!("mem_add")),
            (group_id, new_member.clone(), actor.clone()),
        );

        Self::record_activity(
            &env,
            group_id,
            ActivityType::MemberAdded,
            actor,
            Some(new_member),
            0,
        );

        Ok(())
    }

    pub fn settle_debt(
        env: Env,
        from: Address,
        group_id: u32,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        from.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)?;

        if !group.members.contains(&from) || !group.members.contains(&to) {
            return Err(Error::NotAMember);
        }

        let from_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(group_id, from.clone()))
            .unwrap_or(0);

        if from_balance >= 0 {
            return Err(Error::InvalidAmount);
        }

        if amount > -from_balance {
            return Err(Error::InvalidAmount);
        }

        let to_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(group_id, to.clone()))
            .unwrap_or(0);

        env.storage().persistent().set(
            &DataKey::Balance(group_id, from.clone()),
            &(from_balance + amount),
        );
        env.storage().persistent().set(
            &DataKey::Balance(group_id, to.clone()),
            &(to_balance - amount),
        );

        env.events().publish(
            (symbol!("debt"), symbol!("settled")),
            (group_id, from.clone(), to.clone(), amount),
        );

        Self::record_activity(
            &env,
            group_id,
            ActivityType::Settlement,
            from,
            Some(to),
            amount,
        );

        Ok(())
    }

    pub fn get_balance(env: Env, group_id: u32, member: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(group_id, member))
            .unwrap_or(0)
    }

    pub fn get_group(env: Env, group_id: u32) -> Result<Group, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)
    }

    pub fn get_group_count(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Counter)
            .unwrap_or(0)
    }

    pub fn get_group_with_balances(env: Env, group_id: u32) -> Result<GroupWithBalances, Error> {
        let group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)?;

        let mut members = Vec::new(&env);
        for member_addr in group.members.iter() {
            let balance: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(group_id, member_addr.clone()))
                .unwrap_or(0);

            let name = Self::get_user_name(env.clone(), member_addr.clone());

            members.push_back(MemberInfo {
                address: member_addr,
                name,
                balance,
            });
        }

        Ok(GroupWithBalances {
            name: group.name,
            members,
            creator: group.creator,
        })
    }

    pub fn get_settlements(env: Env, group_id: u32) -> Result<Vec<Settlement>, Error> {
        let group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)?;

        let mut debtors: Vec<(Address, i128)> = Vec::new(&env);
        let mut creditors: Vec<(Address, i128)> = Vec::new(&env);

        for member in group.members.iter() {
            let bal: i128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(group_id, member.clone()))
                .unwrap_or(0);
            if bal < 0 {
                debtors.push_back((member.clone(), -bal));
            } else if bal > 0 {
                creditors.push_back((member.clone(), bal));
            }
        }

        let mut settlements: Vec<Settlement> = Vec::new(&env);

        while (debtors.len() > 0) && (creditors.len() > 0) {
            let (d_addr, d_amt) = debtors.get(0).unwrap().clone();
            let (c_addr, c_amt) = creditors.get(0).unwrap().clone();

            let settle_amt = if d_amt < c_amt { d_amt } else { c_amt };

            settlements.push_back(Settlement {
                from: d_addr.clone(),
                to: c_addr.clone(),
                amount: settle_amt,
            });

            let new_d = d_amt - settle_amt;
            let new_c = c_amt - settle_amt;

            if new_d == 0 {
                debtors.remove(0);
            } else {
                debtors.set(0, (d_addr, new_d));
            }

            if new_c == 0 {
                creditors.remove(0);
            } else {
                creditors.set(0, (c_addr, new_c));
            }
        }

        Ok(settlements)
    }

    pub fn get_groups_for_member(env: Env, member: Address) -> Vec<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::MemberGroups(member))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_expenses(env: Env, group_id: u32) -> Vec<Expense> {
        env.storage()
            .persistent()
            .get(&DataKey::Expenses(group_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn delete_group(env: Env, actor: Address, group_id: u32) -> Result<(), Error> {
        actor.require_auth();

        let group: Group = env
            .storage()
            .persistent()
            .get(&DataKey::Group(group_id))
            .ok_or(Error::GroupNotFound)?;

        if actor != group.creator {
            return Err(Error::NotAuthorized);
        }

        for member in group.members.iter() {
            let mut member_groups: Vec<u32> = env
                .storage()
                .persistent()
                .get(&DataKey::MemberGroups(member.clone()))
                .unwrap_or(Vec::new(&env));

            let mut i = 0;
            let mut found = false;
            while i < member_groups.len() {
                if member_groups.get(i).unwrap() == group_id {
                    member_groups.remove(i);
                    found = true;
                    break;
                }
                i += 1;
            }

            if found {
                env.storage()
                    .persistent()
                    .set(&DataKey::MemberGroups(member.clone()), &member_groups);
            }
            env.storage()
                .persistent()
                .remove(&DataKey::Balance(group_id, member));
        }

        env.storage().persistent().remove(&DataKey::Group(group_id));
        env.storage()
            .persistent()
            .remove(&DataKey::Expenses(group_id));

        env.events()
            .publish((symbol!("group"), symbol!("deleted")), group_id);

        Ok(())
    }

    pub fn get_activities(env: Env, group_id: u32) -> Vec<Activity> {
        env.storage()
            .persistent()
            .get(&DataKey::Activities(group_id))
            .unwrap_or(Vec::new(&env))
    }

    fn record_activity(
        env: &Env,
        group_id: u32,
        kind: ActivityType,
        actor: Address,
        recipient: Option<Address>,
        amount: i128,
    ) {
        let mut activities: Vec<Activity> = env
            .storage()
            .persistent()
            .get(&DataKey::Activities(group_id))
            .unwrap_or(Vec::new(env));

        let id = activities.len() + 1;

        activities.push_back(Activity {
            id,
            kind,
            actor,
            recipient,
            amount,
            timestamp: env.ledger().timestamp(),
        });

        env.storage()
            .persistent()
            .set(&DataKey::Activities(group_id), &activities);
    }
}

mod test;
