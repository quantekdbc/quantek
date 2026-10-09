#![allow(clippy::too_many_arguments)]

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    hash::hashv,
    instruction::{AccountMeta, Instruction},
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    system_program,
    sysvar::Sysvar,
};
use std::str::FromStr;

const VAULT_SEED: &[u8] = b"qvault";
const PROOF_SEED: &[u8] = b"qproof";
const PROOF_DOMAIN: &[u8] = b"quantek.network/proof/v1";
const WALLET_DOMAIN: &[u8] = b"quantek.network/quantum-wallet/v1";
const SPEND_TAG: &[u8] = b"spend-v1";
const WOTS_CHAINS: usize = 67;
const MERKLE_HEIGHT: usize = 8;
const MAX_CHAIN_CHUNK: usize = 8;
const FIRST_WALLET_LEAF: u16 = 1;
const EXHAUSTED_LEAF: u16 = 256;

const ERR_INVALID_PDA: u32 = 1;
const ERR_ALREADY_INITIALIZED: u32 = 2;
const ERR_INVALID_STATE: u32 = 3;
const ERR_LEAF_MISMATCH: u32 = 4;
const ERR_BAD_PROOF_DIMENSIONS: u32 = 5;
const ERR_CHAIN_ALREADY_VERIFIED: u32 = 6;
const ERR_PROOF_INCOMPLETE: u32 = 7;
const ERR_ROOT_MISMATCH: u32 = 8;
const ERR_PROOF_NOT_FINALIZED: u32 = 9;
const ERR_INSUFFICIENT_FUNDS: u32 = 10;
const ERR_INVALID_TOKEN_ACCOUNT: u32 = 11;
const ERR_UNSUPPORTED_TOKEN_PROGRAM: u32 = 12;
const ERR_WALLET_EXHAUSTED: u32 = 13;

entrypoint!(process_instruction);

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub enum QuantekInstruction {
    InitializeVault {
        root: [u8; 32],
        public_seed: [u8; 32],
    },
    InitializeSpend {
        recipient: Pubkey,
        mint: Pubkey,
        amount: u64,
        auth_path: Vec<[u8; 32]>,
    },
    VerifyWotsChunk {
        start: u8,
        signatures: Vec<[u8; 32]>,
    },
    FinalizeProof,
    WithdrawSol,
    WithdrawToken,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct VaultState {
    pub version: u8,
    pub bump: u8,
    pub root: [u8; 32],
    pub public_seed: [u8; 32],
    pub current_leaf: u16,
    pub spend_count: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct ProofStage {
    pub version: u8,
    pub bump: u8,
    pub vault: Pubkey,
    pub payer: Pubkey,
    pub leaf: u16,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub next_leaf: u16,
    pub digest: [u8; 32],
    pub auth_path: Vec<[u8; 32]>,
    pub endpoints: Vec<[u8; 32]>,
    pub verified_bitmap: Vec<u8>,
    pub finalized: bool,
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let instruction =
        QuantekInstruction::try_from_slice(input).map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        QuantekInstruction::InitializeVault { root, public_seed } => {
            initialize_vault(program_id, accounts, root, public_seed)
        }
        QuantekInstruction::InitializeSpend {
            recipient,
            mint,
            amount,
            auth_path,
        } => initialize_spend(program_id, accounts, recipient, mint, amount, auth_path),
        QuantekInstruction::VerifyWotsChunk { start, signatures } => {
            verify_wots_chunk(program_id, accounts, start, signatures)
        }
        QuantekInstruction::FinalizeProof => finalize_proof(program_id, accounts),
        QuantekInstruction::WithdrawSol => withdraw_sol(program_id, accounts),
        QuantekInstruction::WithdrawToken => withdraw_token(program_id, accounts),
    }
}

fn initialize_vault(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    root: [u8; 32],
    public_seed: [u8; 32],
) -> ProgramResult {
    let ai = &mut accounts.iter();
    let payer = next_account_info(ai)?;
    let vault = next_account_info(ai)?;
    let system = next_account_info(ai)?;

    require_signer(payer)?;
    require_key(system, &system_program::ID)?;

    let (expected, bump) = Pubkey::find_program_address(&[VAULT_SEED, &root], program_id);
    require_key(vault, &expected)?;

    if vault.owner == program_id && !vault.data_is_empty() {
        return Err(custom(ERR_ALREADY_INITIALIZED));
    }

    let state = VaultState {
        version: 1,
        bump,
        root,
        public_seed,
        current_leaf: FIRST_WALLET_LEAF,
        spend_count: 0,
    };
    let serialized = borsh::to_vec(&state).map_err(|_| ProgramError::InvalidAccountData)?;
    let rent = Rent::get()?.minimum_balance(serialized.len());

    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            vault.key,
            rent,
            serialized.len() as u64,
            program_id,
        ),
        &[payer.clone(), vault.clone(), system.clone()],
        &[&[VAULT_SEED, &root, &[bump]]],
    )?;
    store(vault, &state)?;
    msg!("QUANTEK Quantum Wallet initialized at leaf {}", FIRST_WALLET_LEAF);
    Ok(())
}

fn initialize_spend(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    recipient: Pubkey,
    mint: Pubkey,
    amount: u64,
    auth_path: Vec<[u8; 32]>,
) -> ProgramResult {
    let ai = &mut accounts.iter();
    let payer = next_account_info(ai)?;
    let vault = next_account_info(ai)?;
    let stage = next_account_info(ai)?;
    let system = next_account_info(ai)?;

    require_signer(payer)?;
    require_owner(vault, program_id)?;
    require_key(system, &system_program::ID)?;

    if amount == 0 {
        return Err(ProgramError::InvalidArgument);
    }
    if auth_path.len() != MERKLE_HEIGHT {
        return Err(custom(ERR_BAD_PROOF_DIMENSIONS));
    }

    let vault_state: VaultState = load(vault)?;
    if vault_state.current_leaf >= EXHAUSTED_LEAF {
        return Err(custom(ERR_WALLET_EXHAUSTED));
    }
    let leaf = vault_state.current_leaf;
    let next_leaf = leaf.checked_add(1).ok_or_else(|| custom(ERR_WALLET_EXHAUSTED))?;

    let leaf_bytes = leaf.to_be_bytes();
    let (expected_stage, bump) =
        Pubkey::find_program_address(&[PROOF_SEED, vault.key.as_ref(), &leaf_bytes], program_id);
    require_key(stage, &expected_stage)?;

    if stage.owner == program_id && !stage.data_is_empty() {
        return Err(custom(ERR_ALREADY_INITIALIZED));
    }

    let digest = spend_digest(
        program_id,
        vault.key,
        leaf,
        &recipient,
        &mint,
        amount,
        next_leaf,
    );

    let state = ProofStage {
        version: 1,
        bump,
        vault: *vault.key,
        payer: *payer.key,
        leaf,
        recipient,
        mint,
        amount,
        next_leaf,
        digest,
        auth_path,
        endpoints: vec![[0u8; 32]; WOTS_CHAINS],
        verified_bitmap: vec![0u8; 9],
        finalized: false,
    };

    let serialized = borsh::to_vec(&state).map_err(|_| ProgramError::InvalidAccountData)?;
    let rent = Rent::get()?.minimum_balance(serialized.len());

    invoke_signed(
        &system_instruction::create_account(
            payer.key,
            stage.key,
            rent,
            serialized.len() as u64,
            program_id,
        ),
        &[payer.clone(), stage.clone(), system.clone()],
        &[&[
            PROOF_SEED,
            vault.key.as_ref(),
            &leaf_bytes,
            &[bump],
        ]],
    )?;
    store(stage, &state)?;
    msg!("QUANTEK spend staged at leaf {}", leaf);
    Ok(())
}

fn verify_wots_chunk(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    start: u8,
    signatures: Vec<[u8; 32]>,
) -> ProgramResult {
    let ai = &mut accounts.iter();
    let vault = next_account_info(ai)?;
    let stage = next_account_info(ai)?;

    require_owner(vault, program_id)?;
    require_owner(stage, program_id)?;

    if signatures.is_empty() || signatures.len() > MAX_CHAIN_CHUNK {
        return Err(custom(ERR_BAD_PROOF_DIMENSIONS));
    }

    let vault_state: VaultState = load(vault)?;
    let mut proof: ProofStage = load(stage)?;
    validate_stage(&proof, vault, &vault_state)?;

    let first = start as usize;
    let end = first
        .checked_add(signatures.len())
        .ok_or(ProgramError::InvalidArgument)?;
    if end > WOTS_CHAINS {
        return Err(custom(ERR_BAD_PROOF_DIMENSIONS));
    }

    let digits = base16_digits(&proof.digest);
    for (offset, signature) in signatures.into_iter().enumerate() {
        let index = first + offset;
        if bitmap_get(&proof.verified_bitmap, index) {
            return Err(custom(ERR_CHAIN_ALREADY_VERIFIED));
        }
        let digit = digits[index];
        let endpoint = walk_chain(
            signature,
            &vault_state.public_seed,
            proof.leaf as u32,
            index as u8,
            digit,
            15,
        );
        proof.endpoints[index] = endpoint;
        bitmap_set(&mut proof.verified_bitmap, index);
    }

    store(stage, &proof)?;
    msg!("QUANTEK verified WOTS chains {}..{}", first, end - 1);
    Ok(())
}

fn finalize_proof(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let ai = &mut accounts.iter();
    let vault = next_account_info(ai)?;
    let stage = next_account_info(ai)?;

    require_owner(vault, program_id)?;
    require_owner(stage, program_id)?;

    let vault_state: VaultState = load(vault)?;
    let mut proof: ProofStage = load(stage)?;
    validate_stage(&proof, vault, &vault_state)?;

    if !(0..WOTS_CHAINS).all(|index| bitmap_get(&proof.verified_bitmap, index)) {
        return Err(custom(ERR_PROOF_INCOMPLETE));
    }

    let mut node = leaf_hash(
        &vault_state.public_seed,
        proof.leaf as u32,
        &proof.endpoints,
    );
    let mut index = proof.leaf as u32;

    for level in 0..MERKLE_HEIGHT {
        let sibling = proof.auth_path[level];
        let parent_index = index >> 1;
        node = if index & 1 == 1 {
            node_hash(
                &vault_state.public_seed,
                level as u8,
                parent_index,
                &sibling,
                &node,
            )
        } else {
            node_hash(
                &vault_state.public_seed,
                level as u8,
                parent_index,
                &node,
                &sibling,
            )
        };
        index = parent_index;
    }

    if node != vault_state.root {
        return Err(custom(ERR_ROOT_MISMATCH));
    }

    proof.finalized = true;
    store(stage, &proof)?;
    msg!("QUANTEK WOTS/Merkle proof finalized for leaf {}", proof.leaf);
    Ok(())
}

fn withdraw_sol(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let ai = &mut accounts.iter();
    let vault = next_account_info(ai)?;
    let stage = next_account_info(ai)?;
    let recipient = next_account_info(ai)?;
    let payer = next_account_info(ai)?;

    require_owner(vault, program_id)?;
    require_owner(stage, program_id)?;

    let mut vault_state: VaultState = load(vault)?;
    let proof: ProofStage = load(stage)?;
    validate_execution(program_id, &proof, vault, &vault_state, payer)?;

    if proof.mint != Pubkey::default() {
        return Err(ProgramError::InvalidArgument);
    }
    require_key(recipient, &proof.recipient)?;

    let rent_floor = Rent::get()?.minimum_balance(vault.data_len());
    let available = vault.lamports().saturating_sub(rent_floor);
    if proof.amount > available {
        return Err(custom(ERR_INSUFFICIENT_FUNDS));
    }

    {
        let mut vault_lamports = vault.try_borrow_mut_lamports()?;
        **vault_lamports = vault_lamports
            .checked_sub(proof.amount)
            .ok_or_else(|| custom(ERR_INSUFFICIENT_FUNDS))?;
    }
    {
        let mut recipient_lamports = recipient.try_borrow_mut_lamports()?;
        **recipient_lamports = recipient_lamports
            .checked_add(proof.amount)
            .ok_or(ProgramError::InvalidAccountData)?;
    }

    advance_vault(&mut vault_state, &proof)?;
    store(vault, &vault_state)?;
    close_stage(stage, payer)?;
    msg!("QUANTEK native SOL spend executed; next leaf {}", vault_state.current_leaf);
    Ok(())
}

fn withdraw_token(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let ai = &mut accounts.iter();
    let vault = next_account_info(ai)?;
    let stage = next_account_info(ai)?;
    let source = next_account_info(ai)?;
    let mint = next_account_info(ai)?;
    let destination = next_account_info(ai)?;
    let token_program = next_account_info(ai)?;
    let payer = next_account_info(ai)?;

    require_owner(vault, program_id)?;
    require_owner(stage, program_id)?;

    let mut vault_state: VaultState = load(vault)?;
    let proof: ProofStage = load(stage)?;
    validate_execution(program_id, &proof, vault, &vault_state, payer)?;

    if proof.mint == Pubkey::default() || proof.mint != *mint.key {
        return Err(ProgramError::InvalidArgument);
    }
    require_key(destination, &proof.recipient)?;
    validate_token_program(token_program.key)?;

    if source.owner != token_program.key
        || destination.owner != token_program.key
        || mint.owner != token_program.key
    {
        return Err(custom(ERR_INVALID_TOKEN_ACCOUNT));
    }

    validate_token_account(source, mint.key, vault.key)?;
    validate_token_account_mint(destination, mint.key)?;
    let decimals = mint_decimals(mint)?;

    let mut data = Vec::with_capacity(10);
    data.push(12u8);
    data.extend_from_slice(&proof.amount.to_le_bytes());
    data.push(decimals);

    let ix = Instruction {
        program_id: *token_program.key,
        accounts: vec![
            AccountMeta::new(*source.key, false),
            AccountMeta::new_readonly(*mint.key, false),
            AccountMeta::new(*destination.key, false),
            AccountMeta::new_readonly(*vault.key, true),
        ],
        data,
    };

    let vault_seeds: &[&[u8]] = &[
        VAULT_SEED,
        &vault_state.root,
        &[vault_state.bump],
    ];

    invoke_signed(
        &ix,
        &[
            source.clone(),
            mint.clone(),
            destination.clone(),
            vault.clone(),
            token_program.clone(),
        ],
        &[vault_seeds],
    )?;

    advance_vault(&mut vault_state, &proof)?;
    store(vault, &vault_state)?;
    close_stage(stage, payer)?;
    msg!("QUANTEK token spend executed; next leaf {}", vault_state.current_leaf);
    Ok(())
}

fn validate_stage(
    proof: &ProofStage,
    vault: &AccountInfo,
    vault_state: &VaultState,
) -> ProgramResult {
    if proof.vault != *vault.key {
        return Err(custom(ERR_INVALID_STATE));
    }
    if proof.leaf != vault_state.current_leaf {
        return Err(custom(ERR_LEAF_MISMATCH));
    }
    if proof.auth_path.len() != MERKLE_HEIGHT
        || proof.endpoints.len() != WOTS_CHAINS
        || proof.verified_bitmap.len() != 9
    {
        return Err(custom(ERR_BAD_PROOF_DIMENSIONS));
    }
    Ok(())
}

fn validate_execution(
    program_id: &Pubkey,
    proof: &ProofStage,
    vault: &AccountInfo,
    vault_state: &VaultState,
    payer: &AccountInfo,
) -> ProgramResult {
    validate_stage(proof, vault, vault_state)?;
    if !proof.finalized {
        return Err(custom(ERR_PROOF_NOT_FINALIZED));
    }
    require_key(payer, &proof.payer)?;
    let expected = spend_digest(
        program_id,
        vault.key,
        proof.leaf,
        &proof.recipient,
        &proof.mint,
        proof.amount,
        proof.next_leaf,
    );
    if expected != proof.digest {
        return Err(custom(ERR_INVALID_STATE));
    }
    Ok(())
}

fn advance_vault(vault: &mut VaultState, proof: &ProofStage) -> ProgramResult {
    if proof.leaf != vault.current_leaf || proof.next_leaf != proof.leaf + 1 {
        return Err(custom(ERR_LEAF_MISMATCH));
    }
    vault.current_leaf = proof.next_leaf;
    vault.spend_count = vault
        .spend_count
        .checked_add(1)
        .ok_or(ProgramError::InvalidAccountData)?;
    Ok(())
}

fn close_stage(stage: &AccountInfo, payer: &AccountInfo) -> ProgramResult {
    let stage_balance = stage.lamports();
    {
        let mut payer_lamports = payer.try_borrow_mut_lamports()?;
        **payer_lamports = payer_lamports
            .checked_add(stage_balance)
            .ok_or(ProgramError::InvalidAccountData)?;
    }
    **stage.try_borrow_mut_lamports()? = 0;
    stage.realloc(0, false)?;
    stage.assign(&system_program::ID);
    Ok(())
}

fn spend_digest(
    program_id: &Pubkey,
    vault: &Pubkey,
    leaf: u16,
    recipient: &Pubkey,
    mint: &Pubkey,
    amount: u64,
    next_leaf: u16,
) -> [u8; 32] {
    let leaf_bytes = leaf.to_be_bytes();
    let amount_bytes = amount.to_be_bytes();
    let next_leaf_bytes = next_leaf.to_be_bytes();

    let commitment = hashv(&[
        SPEND_TAG,
        program_id.as_ref(),
        vault.as_ref(),
        &leaf_bytes,
        recipient.as_ref(),
        mint.as_ref(),
        &amount_bytes,
        &next_leaf_bytes,
    ]);

    hashv(&[WALLET_DOMAIN, &[0u8], commitment.as_ref()]).to_bytes()
}

fn base16_digits(digest: &[u8; 32]) -> [u8; WOTS_CHAINS] {
    let mut out = [0u8; WOTS_CHAINS];
    let mut cursor = 0usize;
    let mut checksum: u16 = 0;

    for byte in digest {
        let hi = byte >> 4;
        let lo = byte & 15;
        out[cursor] = hi;
        out[cursor + 1] = lo;
        checksum += (15 - hi) as u16 + (15 - lo) as u16;
        cursor += 2;
    }

    out[66] = (checksum & 0x0f) as u8;
    checksum >>= 4;
    out[65] = (checksum & 0x0f) as u8;
    checksum >>= 4;
    out[64] = (checksum & 0x0f) as u8;
    out
}

fn walk_chain(
    mut value: [u8; 32],
    public_seed: &[u8; 32],
    leaf: u32,
    index: u8,
    start: u8,
    end: u8,
) -> [u8; 32] {
    let leaf_bytes = leaf.to_be_bytes();
    for step in start..end {
        value = hashv(&[
            PROOF_DOMAIN,
            public_seed,
            &leaf_bytes,
            &[index, step],
            &value,
        ])
        .to_bytes();
    }
    value
}

fn leaf_hash(
    public_seed: &[u8; 32],
    leaf: u32,
    endpoints: &[[u8; 32]],
) -> [u8; 32] {
    let leaf_bytes = leaf.to_be_bytes();
    let mut parts: Vec<&[u8]> = Vec::with_capacity(4 + endpoints.len());
    parts.push(PROOF_DOMAIN);
    parts.push(b"leaf");
    parts.push(public_seed);
    parts.push(&leaf_bytes);
    for endpoint in endpoints {
        parts.push(endpoint);
    }
    hashv(&parts).to_bytes()
}

fn node_hash(
    public_seed: &[u8; 32],
    level: u8,
    index: u32,
    left: &[u8; 32],
    right: &[u8; 32],
) -> [u8; 32] {
    let index_bytes = index.to_be_bytes();
    hashv(&[
        PROOF_DOMAIN,
        b"node",
        public_seed,
        &[level],
        &index_bytes,
        left,
        right,
    ])
    .to_bytes()
}

fn bitmap_get(bitmap: &[u8], index: usize) -> bool {
    bitmap[index / 8] & (1u8 << (index % 8)) != 0
}

fn bitmap_set(bitmap: &mut [u8], index: usize) {
    bitmap[index / 8] |= 1u8 << (index % 8);
}

fn validate_token_program(key: &Pubkey) -> ProgramResult {
    let spl_token =
        Pubkey::from_str("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").map_err(|_| ProgramError::InvalidArgument)?;
    let token_2022 =
        Pubkey::from_str("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb").map_err(|_| ProgramError::InvalidArgument)?;

    if *key != spl_token && *key != token_2022 {
        return Err(custom(ERR_UNSUPPORTED_TOKEN_PROGRAM));
    }
    Ok(())
}

fn validate_token_account(
    account: &AccountInfo,
    expected_mint: &Pubkey,
    expected_authority: &Pubkey,
) -> ProgramResult {
    let data = account.try_borrow_data()?;
    if data.len() < 72 {
        return Err(custom(ERR_INVALID_TOKEN_ACCOUNT));
    }
    if data[0..32] != expected_mint.to_bytes() || data[32..64] != expected_authority.to_bytes() {
        return Err(custom(ERR_INVALID_TOKEN_ACCOUNT));
    }
    Ok(())
}

fn validate_token_account_mint(account: &AccountInfo, expected_mint: &Pubkey) -> ProgramResult {
    let data = account.try_borrow_data()?;
    if data.len() < 72 || data[0..32] != expected_mint.to_bytes() {
        return Err(custom(ERR_INVALID_TOKEN_ACCOUNT));
    }
    Ok(())
}

fn mint_decimals(mint: &AccountInfo) -> Result<u8, ProgramError> {
    let data = mint.try_borrow_data()?;
    if data.len() < 45 {
        return Err(custom(ERR_INVALID_TOKEN_ACCOUNT));
    }
    Ok(data[44])
}

fn load<T: BorshDeserialize>(account: &AccountInfo) -> Result<T, ProgramError> {
    T::try_from_slice(&account.try_borrow_data()?).map_err(|_| ProgramError::InvalidAccountData)
}

fn store<T: BorshSerialize>(account: &AccountInfo, value: &T) -> ProgramResult {
    let bytes = borsh::to_vec(value).map_err(|_| ProgramError::InvalidAccountData)?;
    let mut data = account.try_borrow_mut_data()?;
    if bytes.len() > data.len() {
        return Err(ProgramError::AccountDataTooSmall);
    }
    data.fill(0);
    data[..bytes.len()].copy_from_slice(&bytes);
    Ok(())
}

fn require_signer(account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    Ok(())
}

fn require_owner(account: &AccountInfo, owner: &Pubkey) -> ProgramResult {
    if account.owner != owner {
        return Err(ProgramError::IncorrectProgramId);
    }
    Ok(())
}

fn require_key(account: &AccountInfo, key: &Pubkey) -> ProgramResult {
    if account.key != key {
        return Err(custom(ERR_INVALID_PDA));
    }
    Ok(())
}

fn custom(code: u32) -> ProgramError {
    ProgramError::Custom(code)
}
