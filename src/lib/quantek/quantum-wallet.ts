import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {DOMAINS, H, fromHex, hex, utf8} from './pq';

export const QUANTEK_QUANTUM_WALLET_PROGRAM_ID =
  (import.meta.env.VITE_QUANTEK_QUANTUM_WALLET_PROGRAM_ID as string | undefined)?.trim() || null;

export const QUANTUM_WALLET_STATUS = QUANTEK_QUANTUM_WALLET_PROGRAM_ID
  ? 'Verifier configured'
  : 'Verifier setup required';

export const STAGE_CHAIN_COUNT = 8;
const ZERO_MINT = new PublicKey(new Uint8Array(32));

export type QuantumWalletProgramStatus =
  | {state:'unconfigured'; programId:null}
  | {state:'configured'; programId:string; executable:false; reason:string}
  | {state:'verified'; programId:string; executable:true}
  | {state:'initialized'; programId:string; executable:true; vault:string; currentLeaf:number; spendCount:bigint};

export type VaultState = {
  version:number;
  bump:number;
  root:string;
  publicSeed:string;
  currentLeaf:number;
  spendCount:bigint;
};

export type SpendProofInput = {
  recipient:PublicKey;
  mint:PublicKey | null;
  amountAtomic:bigint;
  authPath:string[];
};

const u16be=(n:number)=>new Uint8Array([(n>>>8)&255,n&255]);
const u32le=(n:number)=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
const u64le=(n:bigint)=>{const b=new Uint8Array(8);new DataView(b.buffer).setBigUint64(0,n,true);return b};
const u64be=(n:bigint)=>{const b=new Uint8Array(8);new DataView(b.buffer).setBigUint64(0,n,false);return b};
const concat=(...xs:Uint8Array[])=>{const out=new Uint8Array(xs.reduce((n,x)=>n+x.length,0));let o=0;for(const x of xs){out.set(x,o);o+=x.length}return out};
const asBuffer=(x:Uint8Array)=>x as unknown as Buffer;
const ix=(programId:PublicKey,tag:number,keys:TransactionInstruction['keys'],body=new Uint8Array())=>
  new TransactionInstruction({programId,keys,data:asBuffer(concat(new Uint8Array([tag]),body))});

export function configuredQuantumWalletProgramId(){
  if(!QUANTEK_QUANTUM_WALLET_PROGRAM_ID)return null;
  try{return new PublicKey(QUANTEK_QUANTUM_WALLET_PROGRAM_ID)}catch{return null}
}

export async function verifyQuantumWalletProgram(connection:Connection){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)return {state:'unconfigured',programId:null} as const;
  const account=await connection.getAccountInfo(programId,'confirmed');
  if(!account)return {state:'configured',programId:programId.toBase58(),executable:false,reason:'Program account not found on the selected network.'} as const;
  if(!account.executable)return {state:'configured',programId:programId.toBase58(),executable:false,reason:'Configured account exists but is not executable.'} as const;
  return {state:'verified',programId:programId.toBase58(),executable:true} as const;
}

export function deriveVaultPda(root:string,programId=configuredQuantumWalletProgramId()){
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  return PublicKey.findProgramAddressSync([utf8('qvault'),fromHex(root)],programId);
}

export function deriveProofStagePda(vault:PublicKey,leaf:number,programId=configuredQuantumWalletProgramId()){
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  return PublicKey.findProgramAddressSync([utf8('qproof'),vault.toBytes(),u16be(leaf)],programId);
}

export async function loadVaultState(connection:Connection,root:string):Promise<{address:PublicKey;state:VaultState}|null>{
  const [address]=deriveVaultPda(root);
  const info=await connection.getAccountInfo(address,'confirmed');
  if(!info)return null;
  const d=new Uint8Array(info.data);
  if(d.length<76)throw new Error('Quantum Wallet vault account has invalid state length.');
  const view=new DataView(d.buffer,d.byteOffset,d.byteLength);
  return {address,state:{
    version:d[0]!, bump:d[1]!,
    root:hex(d.slice(2,34)),
    publicSeed:hex(d.slice(34,66)),
    currentLeaf:view.getUint16(66,true),
    spendCount:view.getBigUint64(68,true),
  }};
}

export async function quantumWalletStatus(connection:Connection,root?:string):Promise<QuantumWalletProgramStatus>{
  const status=await verifyQuantumWalletProgram(connection);
  if(status.state!=='verified'||!root)return status;
  const vault=await loadVaultState(connection,root);
  if(!vault)return status;
  return {state:'initialized',programId:status.programId,executable:true,vault:vault.address.toBase58(),currentLeaf:vault.state.currentLeaf,spendCount:vault.state.spendCount};
}

export function buildInitializeVaultTransaction(payer:PublicKey,root:string,publicSeed:string){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)throw new Error('Set VITE_QUANTEK_QUANTUM_WALLET_PROGRAM_ID before initializing a live Quantum Wallet.');
  const [vault]=deriveVaultPda(root,programId);
  const instruction=ix(programId,0,[
    {pubkey:payer,isSigner:true,isWritable:true},
    {pubkey:vault,isSigner:false,isWritable:true},
    {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
  ],concat(fromHex(root),fromHex(publicSeed)));
  return {vault,transaction:new Transaction().add(instruction)};
}

export function buildDepositSolTransaction(from:PublicKey,root:string,lamports:bigint){
  if(lamports<=0n||lamports>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Invalid SOL deposit amount.');
  const [vault]=deriveVaultPda(root);
  return {vault,transaction:new Transaction().add(SystemProgram.transfer({fromPubkey:from,toPubkey:vault,lamports:Number(lamports)}))};
}

export async function buildInitializeSpendTransaction(
  connection:Connection,
  payer:PublicKey,
  root:string,
  input:SpendProofInput,
){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  if(input.authPath.length!==8)throw new Error('Quantum Wallet spend requires an 8-level Merkle authentication path.');
  const vault=await loadVaultState(connection,root);
  if(!vault)throw new Error('Initialize the Quantum Wallet vault on Solana first.');
  if(vault.state.currentLeaf>=256)throw new Error('Quantum Wallet leaf budget is exhausted.');
  const [stage]=deriveProofStagePda(vault.address,vault.state.currentLeaf,programId);
  const mint=input.mint??ZERO_MINT;
  const body=concat(
    input.recipient.toBytes(),
    mint.toBytes(),
    u64le(input.amountAtomic),
    u32le(input.authPath.length),
    ...input.authPath.map(fromHex),
  );
  return {
    vault:vault.address,
    stage,
    leaf:vault.state.currentLeaf,
    transaction:new Transaction().add(ix(programId,1,[
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:vault.address,isSigner:false,isWritable:true},
      {pubkey:stage,isSigner:false,isWritable:true},
      {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
    ],body)),
  };
}

export function buildVerifyWotsChunkTransaction(vault:PublicKey,leaf:number,start:number,signatures:string[]){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  if(signatures.length<1||signatures.length>STAGE_CHAIN_COUNT)throw new Error('Stage 1–8 WOTS chains per transaction.');
  const [stage]=deriveProofStagePda(vault,leaf,programId);
  const body=concat(new Uint8Array([start]),u32le(signatures.length),...signatures.map(fromHex));
  return new Transaction().add(ix(programId,2,[
    {pubkey:vault,isSigner:false,isWritable:false},
    {pubkey:stage,isSigner:false,isWritable:true},
  ],body));
}

export function buildFinalizeProofTransaction(vault:PublicKey,leaf:number){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  const [stage]=deriveProofStagePda(vault,leaf,programId);
  return new Transaction().add(ix(programId,3,[
    {pubkey:vault,isSigner:false,isWritable:false},
    {pubkey:stage,isSigner:false,isWritable:true},
  ]));
}

export function buildWithdrawSolTransaction(vault:PublicKey,leaf:number,recipient:PublicKey,payer:PublicKey){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  const [stage]=deriveProofStagePda(vault,leaf,programId);
  return new Transaction().add(ix(programId,4,[
    {pubkey:vault,isSigner:false,isWritable:true},
    {pubkey:stage,isSigner:false,isWritable:true},
    {pubkey:recipient,isSigner:false,isWritable:true},
    {pubkey:payer,isSigner:false,isWritable:true},
  ]));
}

export function buildWithdrawTokenTransaction(args:{
  vault:PublicKey;leaf:number;source:PublicKey;mint:PublicKey;destination:PublicKey;tokenProgram:PublicKey;payer:PublicKey
}){
  const programId=configuredQuantumWalletProgramId();
  if(!programId)throw new Error('Quantum Wallet verifier setup required.');
  const [stage]=deriveProofStagePda(args.vault,args.leaf,programId);
  return new Transaction().add(ix(programId,5,[
    {pubkey:args.vault,isSigner:false,isWritable:true},
    {pubkey:stage,isSigner:false,isWritable:true},
    {pubkey:args.source,isSigner:false,isWritable:true},
    {pubkey:args.mint,isSigner:false,isWritable:false},
    {pubkey:args.destination,isSigner:false,isWritable:true},
    {pubkey:args.tokenProgram,isSigner:false,isWritable:false},
    {pubkey:args.payer,isSigner:false,isWritable:true},
  ]));
}

export function quantumWalletSpendDigest(args:{
  programId:PublicKey;vault:PublicKey;leaf:number;recipient:PublicKey;mint:PublicKey|null;amountAtomic:bigint
}){
  const nextLeaf=args.leaf+1;
  const commitment=H(
    utf8('spend-v1'),
    args.programId.toBytes(),
    args.vault.toBytes(),
    u16be(args.leaf),
    args.recipient.toBytes(),
    (args.mint??ZERO_MINT).toBytes(),
    u64be(args.amountAtomic),
    u16be(nextLeaf),
  );
  return H(utf8(DOMAINS.quantumWallet),new Uint8Array([0]),commitment);
}

export function canExecuteLive(){return configuredQuantumWalletProgramId()!==null}
