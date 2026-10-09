import {createFileRoute} from '@tanstack/react-router';
import {SettingsPage} from '@/components/quantek/operations';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/settings')({head:()=>metadata('Settings','Configure Solana network, RPC and execution policy.'),component:SettingsPage});