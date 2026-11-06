const fs = require('fs-extra');
const path = require('path');

async function prepareDeploy() {
  const deployDir = path.resolve(__dirname, '../dist-deploy');
  await fs.ensureDir(deployDir);

  const docsDistDir = path.resolve(__dirname, '../docs/.vitepress/dist');
  const docsTargetDir = path.resolve(deployDir, 'docs');
  await fs.ensureDir(docsTargetDir);
  await fs.copy(docsDistDir, docsTargetDir, {
    filter: (src) => !src.includes('.git'),
  });

  const demoDistDir = path.resolve(__dirname, '../demos/vue3-demo/dist');
  const demoTargetDir = path.resolve(deployDir, 'demo');
  await fs.ensureDir(demoTargetDir);
  await fs.copy(demoDistDir, demoTargetDir, {
    filter: (src) => !src.includes('.git'),
  });

  const indexHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Speed Board</title>
    <script>
      const path = window.location.pathname;
      if (path === '/' || path === '/speed-board/' || path === '/speed-board/index.html') {
        window.location.href = '/speed-board/docs/';
      }
    </script>
  </head>
  <body>
    <p>If you are not redirected automatically, <a href="/speed-board/docs/">click here</a>.</p>
  </body>
</html>
  `.trim();

  await fs.writeFile(path.resolve(deployDir, 'index.html'), indexHtml);
  console.log('Deploy files prepared successfully in dist-deploy!');
}

prepareDeploy().catch((err) => {
  console.error('Error in prepareDeploy:', err);
  process.exit(1);
});
