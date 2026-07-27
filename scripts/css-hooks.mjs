// Node customization hook: co-located block CSS imports resolve to an empty
// module in Node (the CLI export only needs the components, not the styles).
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  return nextLoad(url, context);
}
