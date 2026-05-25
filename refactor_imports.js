const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('./src');

const aliases = {
  '@utils': path.resolve('./src/common/utiles'),
  '@interfaces': path.resolve('./src/common/interfaces'),
  '@models': path.resolve('./src/models'),
  '@services': path.resolve('./src/common/service'),
  '@guards': path.resolve('./src/common/guards'),
  '@decorators': path.resolve('./src/common/decorators'),
  '@src': path.resolve('./src') // fallback
};

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.ts')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const files = getFiles(srcDir);
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // matches import/export from relative path
  const regex = /(?:import|export)\s+[^'"]*from\s+['"](\.[^'"]+)['"]/g;
  const bareRegex = /import\s+['"](\.[^'"]+)['"]/g;

  function replacer(match, relPath) {
    const absPath = path.resolve(path.dirname(file), relPath);
    
    let bestAlias = null;
    let bestAliasPath = null;
    
    for (const [alias, aliasPath] of Object.entries(aliases)) {
      if (absPath.startsWith(aliasPath)) {
        if (!bestAliasPath || aliasPath.length > bestAliasPath.length) {
          bestAlias = alias;
          bestAliasPath = aliasPath;
        }
      }
    }
    
    if (bestAlias) {
      let relativeToAlias = absPath.substring(bestAliasPath.length).replace(/\\/g, '/');
      if (relativeToAlias.startsWith('/')) relativeToAlias = relativeToAlias.substring(1);
      
      let newPath = bestAlias + (relativeToAlias ? '/' + relativeToAlias : '');
      
      return match.replace(/['"](\.[^'"]+)['"]/, "'" + newPath + "'");
    }
    
    return match;
  }

  content = content.replace(regex, replacer);
  content = content.replace(bareRegex, replacer);

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Updated: ' + file);
  }
}

console.log('Done. Changed ' + changedFiles + ' files.');
