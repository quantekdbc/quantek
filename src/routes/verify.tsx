import {createFileRoute} from '@tanstack/react-router';
import {VerifyPage} from '@/components/quantek/provenance';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/verify')({head:()=>metadata('Verify Provenance','Local SHA-256 WOTS and Merkle-path demonstration verifier.'),component:VerifyPage});