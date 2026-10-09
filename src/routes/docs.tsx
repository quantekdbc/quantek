import {createFileRoute} from '@tanstack/react-router';
import {DocsPage} from '@/components/quantek/docs';
import {metadata} from '@/lib/quantek/data';
export const Route=createFileRoute('/docs')({head:()=>metadata('Docs','QUANTEK technical documentation: WOTS-16 identity, Quantum Launch, Meteora DBC and security boundaries.'),component:DocsPage});