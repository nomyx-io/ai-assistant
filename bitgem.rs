/*
okay so I am going to describe a contract - this contract mints NFTs called bitgems. You mint a bitgem by depositing solana into the contract, and waiting some amount of time. you can adjust the waiting time (within min and max we set upfron) but the price/time cost always remains the same - wait less time pay more money, wait more time pay less money. Depositing the solana in the contract creates you a claim. this claim is like a bearer bond, it can be exchanged back for the deposited solana. you can then collect on this claim anytime you want, but you will only get a bitgem minted to you if you wait the proscribed amount of time on the claim. if collect previous to the maturity date you get 100% of your money back. if you collect after maturity you get a bitgem minted to you plus you get your original funds minus .1% back and also, the staking price of that bitgem then goes up by some preset percentage of the current price. \
*/


use solana_program::{
    account_info::{AccountInfo, next_account_info},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

use borsh::{BorshDeserialize, BorshSerialize};
use std::cmp;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Claim {
    depositor: Pubkey,  // The public key of the user who made the deposit.
    amount: u64,        // The amount of Solana deposited.
    deposit_time: u64,  // The time when the deposit was made.
    maturity_time: u64, // The time when the BitGem can be collected.
}

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct BitGemContract {
    gem_price: u64,     // The current price for minting a BitGem.
    increase_rate: u64, // The rate at which the gem_price increases.
    claims: Vec<Claim>, // The vector of all outstanding claims.
    successful_claim_increase_percent: f64, // The percentage increase that occurs after each successful claim.
    min_stake_time: u64,
    max_stake_time: u64,
}

impl BitGemContract {
    fn new(price: u64, rate: u64) -> Self {
        Self {
            gem_price: price,
            increase_rate: rate,
            claims: vec![],
        }
    }
}

use solana_program::{
    account_info::{AccountInfo, next_account_info},
    decode_error::DecodeError,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};

use borsh::{BorshDeserialize, BorshSerialize};

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let contract_info = next_account_info(accounts_iter)?;
    match input[0] {
        0 => {
            let user_info = next_account_info(accounts_iter)?;
            let stake_time = u64::from_le_bytes(input[1..9].try_into()?);
            let amount = u64::from_le_bytes(input[9..17].try_into()?);
            deposit(user_info, contract_info, stake_time, amount)
        }
        1 => {
            let claimer_info = next_account_info(accounts_iter)?;
            claim(claimer_info, contract_info)
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }
    Ok(())
}

fn deposit(user_info: &AccountInfo, contract_info: &AccountInfo, stake_time: u64, amount: u64) -> ProgramResult {
    let mut contract_account_data = contract_info.try_borrow_mut_data()?;
    let mut contract = BitGemContract::deserialize(&mut contract_account_data)?;

    if stake_time < contract.min_stake_time || stake_time > contract.max_stake_time {
        return Err(ProgramError::InvalidInstructionData);
    }

    let base_deposit = contract.gem_price;
    let deposit_multiplier = contract.max_stake_time / stake_time;
    let total_deposit = base_deposit * deposit_multiplier;

    if amount < total_deposit {
        return Err(ProgramError::InsufficientFunds);
    }

    contract.claims.push(Claim {
        depositor: *user_info.key,
        amount,
        deposit_time: current_time(),
        maturity_time: stake_time + current_time(),
    });

    let successful_claims = contract.claims.iter().filter(|claim| claim.maturity_time < current_time()).count();

    contract.gem_price += (contract.gem_price as f64 *  (successful_claims as f64 * contract.successful_claim_increase_percent / 100.0)) as u64;

    contract.serialize(&mut contract_account_data)
}

// Instruction to claim BitGem.
fn claim(claimer_info: &AccountInfo, contract_info: &AccountInfo) -> ProgramResult {
    let claimer = **claimer_info.key;

    let mut contract_account_data = contract_info.try_borrow_mut_data()?;
    let mut contract = BitGemContract::deserialize(&mut contract_account_data)?;

    let claim_index = contract.claims.iter().position(|claim| claim.depositor == claimer).ok_or(ProgramError::InvalidInstructionData)?;

    if contract.claims[claim_index].maturity_time <= current_time() {
        // Getting the SplToken Mint
        let mint_account = next_account(accounts_iter)?;

        // Create new SPL Token minting instruction
        let mint_instruction = spl_token::instruction::mint_to(
            &spl_token::id(), // The SPL Token program account
            &mint_account.key, // The mint account
            &claimer_info.key, // The destination account
            &program_id, // The minter's account 
            &[], // Multisig accounts, if any
            1, // Number of tokens to mint
        )?;
        
        // Invoke the mint_to SPL instruction
        invoke_signed(&mint_instruction, &[claimer_info.clone(), mint_account.clone()], &[])?;
        
        // Deduct 0.1% fee.
        let fee = contract.claims[claim_index].amount / 1000;
        let reward = contract.claims[claim_index].amount - fee;

        // Deduct 0.1% fee  
        let fee = contract.claims[claim_index].amount / 1000;  
        let reward = contract.claims[claim_index].amount - fee;  

        // Create a transfer instruction
        let fee_transfer_instruction = solana_program::system_instruction::transfer(
                &claimer_info.key,  
                &contract_info.key,  
                fee
        );

        // Invoke the transfer instruction for the fee
        solana_program::program::invoke(
                &fee_transfer_instruction,
                &[claimer_info.clone(), contract_info.clone()]
        )?;

        // Create another transfer instruction for the reward
        let reward_transfer_instruction = solana_program::system_instruction::transfer(
                &contract_info.key,  
                &claimer_info.key,  
                reward
        );

        // Invoke the transfer instruction for the reward
        solana_program::program::invoke(
                &reward_transfer_instruction,
                &[claimer_info.clone(), contract_info.clone()]
        )?;
    } else {
        let amount = contract.claims[claim_index].amount;
    
        // Create the transfer instruction
        let transfer_instruction = solana_program::system_instruction::transfer(
            &contract_info.key,  // the source account
            &claimer_info.key,  // the destination account
            amount,  // the amount
        );
        
        // Invoke the transfer instruction
        solana_program::program::invoke(
            &transfer_instruction,
            &[contract_info.clone(), claimer_info.clone()]
        )?;
    }

    // Remove the claim from the BitGemContract.
    contract.claims.remove(claim_index);

    contract.serialize(&mut contract_account_data)
}