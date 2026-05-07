const { homedir } = require('node:os');
const { join, normalize, parse, sep } = require('node:path');

function stripTrailingSep(p) {
  if (!p.endsWith(sep)) {
    return p;
  }

  return p === parse(p).root ? p : p.slice(0, -1);
}

function getCodebuddyConfigDir() {
  const home = homedir();
  const configured = (process.env.CODEBUDDY_CONFIG_DIR ?? process.env.CLAUDE_CONFIG_DIR)?.trim();

  if (!configured) {
    return stripTrailingSep(normalize(join(home, '.codebuddy')));
  }

  if (configured === '~') {
    return stripTrailingSep(normalize(home));
  }

  if (configured.startsWith('~/') || configured.startsWith('~\\')) {
    return stripTrailingSep(normalize(join(home, configured.slice(2))));
  }

  return stripTrailingSep(normalize(configured));
}

/** @deprecated Use getCodebuddyConfigDir instead */
const getClaudeConfigDir = getCodebuddyConfigDir;

module.exports = { getCodebuddyConfigDir, getClaudeConfigDir };
