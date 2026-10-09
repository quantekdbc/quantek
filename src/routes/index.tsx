import {createFileRoute} from '@tanstack/react-router';
import {Overview} from '@/components/quantek/overview';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/')({head:()=>metadata('Overview','QUANTEK — non-custodial Solana liquidity operations, Meteora DBC migration and post-quantum provenance.'),component:Overview});