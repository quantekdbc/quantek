import {createFileRoute} from '@tanstack/react-router';
import {IdentityPage} from '@/components/quantek/provenance';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/identity')({head:()=>metadata('PQ Identity','WOTS-16 provenance identity and one-time Merkle leaf budget.'),component:IdentityPage});