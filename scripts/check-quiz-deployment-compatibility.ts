import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assessQuizDeployment, checkpointQuizRpcFingerprints, quizDeploymentInspectionSql } from '../apps/api/src/lib/quiz/deployment-compatibility';

// Offline assessment only. This tool never opens a remote connection, runs a
// migration, reads credentials or authorizes a deployment. SQL mode prints
// the read-only metadata query to run through the target's authorized channel.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--sql') {
    console.info(quizDeploymentInspectionSql);
} else if (args.length === 1 && args[0] !== '--sql') {
    try {
        const migrations = ['20260912110000_quiz_maker.sql', '20261007155114_quiz_matching.sql'].map(name =>
            readFileSync(resolve(__dirname, '../packages/db/migrations', name), 'utf8'));
        const result = assessQuizDeployment(JSON.parse(readFileSync(args[0]!, 'utf8')), checkpointQuizRpcFingerprints(migrations));
        console.info(JSON.stringify(result));
        process.exitCode = result.verdict === 'MATCH' ? 0 : 1;
    } catch {
        // Do not echo input, filesystem paths, metadata or raw errors.
        console.info(JSON.stringify({ verdict: 'BLOCKED', issues: [{ surface: 'inspection', code: 'inspection_unreadable_or_invalid' }] }));
        process.exitCode = 1;
    }
} else {
    console.info('Usage: tsx scripts/check-quiz-deployment-compatibility.ts --sql | <inspection.json>');
    process.exitCode = 2;
}
