import {createFileRoute} from '@tanstack/react-router';
import {ActivityPage} from '@/components/quantek/operations';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/activity')({head:()=>metadata('Activity','Explicit audit trail of simulated plans and liquidity operations.'),component:ActivityPage});