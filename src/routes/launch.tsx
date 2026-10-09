import {createFileRoute} from '@tanstack/react-router';
import {LaunchPage} from '@/components/quantek/launch';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/launch')({head:()=>metadata('DBC Launch','Configure token launches, bonding curves, fees and DAMM v2 migration.'),component:LaunchPage});