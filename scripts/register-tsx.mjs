// Registers tsx (for TS/TSX) plus the CSS stub hook, then runs the CLI entry.
import 'tsx';
import { register } from 'node:module';
register('./css-hooks.mjs', import.meta.url);
