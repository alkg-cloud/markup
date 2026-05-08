export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootOnce } = await import('./lib/boot');
    await bootOnce();
  }
}
