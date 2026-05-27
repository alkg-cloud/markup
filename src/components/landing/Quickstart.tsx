import { C, CodeCard, K, S, V } from './CodeCard';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';
import styles from './Quickstart.module.css';

const DOCKER_RAW = `# 1. Pull and start. The first request runs the setup wizard.
docker run -d --name markup \\
  -p 3000:3000 \\
  -e AUTH_SECRET=$(openssl rand -hex 32) \\
  -v $(pwd)/markup-data:/app/data \\
  ghcr.io/alexandrecamillo/markup:latest`;

const CURL_RAW = `# 2. Read context, apply patch, reply on thread.
curl -H "Authorization: Bearer $TOKEN" \\
     "http://localhost:3000/api/agent/context/$ANNOTATION_ID"
# → { annotation, thread, current_version, diff_since_creation }

curl -X POST -H "Authorization: Bearer $TOKEN" \\
     -d "{ base_version_id, patches: { 'index.html': $DIFF } }" \\
     "http://localhost:3000/api/mockups/$ID/version-patch"`;

export function Quickstart() {
  return (
    <Section width="narrow" id="quickstart">
      <Eyebrow>Quickstart</Eyebrow>
      <h2 className={styles.h2}>Run it in 30 seconds. Open the agent API in 30 more.</h2>
      <CodeCard filename="~/markup/start.sh" copyText={DOCKER_RAW}>
        <C># 1. Pull and start. The first request runs the setup wizard.</C>
        {'\n'}
        docker run -d <K>--name</K> markup \{'\n'}
        {'  '}
        <K>-p</K> <V>3000:3000</V> \{'\n'}
        {'  '}
        <K>-e</K> <V>AUTH_SECRET</V>=<S>$(openssl rand -hex 32)</S> \{'\n'}
        {'  '}
        <K>-v</K> <V>$(pwd)/markup-data:/app/data</V> \{'\n'}
        {'  '}ghcr.io/alexandrecamillo/markup:<S>latest</S>
      </CodeCard>
      <CodeCard filename="~/markup/agent-loop.sh" copyText={CURL_RAW}>
        <C># 2. Read context, apply patch, reply on thread.</C>
        {'\n'}
        curl <K>-H</K> <S>"Authorization: Bearer $TOKEN"</S> \{'\n'}
        {'     '}
        <S>"http://localhost:3000/api/agent/context/$ANNOTATION_ID"</S>
        {'\n'}
        <C>
          # → {'{'} annotation, thread, current_version, diff_since_creation {'}'}
        </C>
        {'\n\n'}
        curl <K>-X</K> POST <K>-H</K> <S>"Authorization: Bearer $TOKEN"</S> \{'\n'}
        {'     '}
        <K>-d</K> <S>{`"{ base_version_id, patches: { 'index.html': $DIFF } }"`}</S> \{'\n'}
        {'     '}
        <S>"http://localhost:3000/api/mockups/$ID/version-patch"</S>
      </CodeCard>
    </Section>
  );
}
