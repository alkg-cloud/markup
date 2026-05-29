import { C, CodeCard, K, S, V } from './CodeCard';
import { Eyebrow } from './primitives/Eyebrow';
import { Section } from './primitives/Section';
import styles from './Quickstart.module.css';

const DOCKER_RAW = `# Pull and start. The first request runs the setup wizard.
docker run -d --name markup \\
  -p 3000:3000 \\
  -e AUTH_SECRET=$(openssl rand -hex 32) \\
  -v $(pwd)/markup-data:/app/data \\
  ghcr.io/alkg-cloud/markup:latest`;

export function Quickstart() {
  return (
    <Section width="narrow" id="quickstart">
      <Eyebrow>Quickstart</Eyebrow>
      <h2 className={styles.h2}>Run it in 30 seconds.</h2>
      <CodeCard filename="~/markup/start.sh" copyText={DOCKER_RAW}>
        <C># Pull and start. The first request runs the setup wizard.</C>
        {'\n'}
        docker run -d <K>--name</K> markup \{'\n'}
        {'  '}
        <K>-p</K> <V>3000:3000</V> \{'\n'}
        {'  '}
        <K>-e</K> <V>AUTH_SECRET</V>=<S>$(openssl rand -hex 32)</S> \{'\n'}
        {'  '}
        <K>-v</K> <V>$(pwd)/markup-data:/app/data</V> \{'\n'}
        {'  '}ghcr.io/alkg-cloud/markup:<S>latest</S>
      </CodeCard>
    </Section>
  );
}
