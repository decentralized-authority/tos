const s3 = require('s3');
const fs = require('fs-extra');
const path = require('path');
const Markdown = require('markdown-it');

const upload = (source, key) => new Promise((resolve, reject) => {
  const client = s3.createClient();
  const params = {
    localFile: source,
    s3Params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ACL: 'public-read',
    }
  };
  const uploader = client.uploadFile(params);
  uploader.on('error', err => {
    reject(err);
  });
  uploader.on('end', () => {
    console.log(`Successfully uploaded ${key}`);
    resolve();
  });
});

(async function() {
  try {

    const md = new Markdown();

    const {
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      S3_BUCKET,
    } = process.env;

    if(!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !S3_BUCKET)
      throw new Error('You must set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET environment variables');

    const rootDir = path.resolve(__dirname, '../');
    const tempDir = path.resolve(__dirname, '../temp');
    await fs.emptydir(tempDir);
    const files = [
      {
        source: 'node_pilot_tos.md',
        key: 'tos.md',
        htmlKey: 'tos.html',
      },
      {
        source: 'w3bcloud_tos.md',
        key: 'w3bcloud_tos.md',
        htmlKey: 'w3bcloud_tos.html',
      },
      {
        source: 'privacy_policy.md',
        key: 'privacy_policy.md',
        htmlKey: 'privacy_policy.html',
      },
    ];
    for(const { source, key, htmlKey } of files) {
      const contents = await fs.readFile(source, 'utf8');
      const basename = path.basename(key, '.md');
      const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>${basename}</title>\n</head>\n<body>\n${md.render(contents)}</body>\n</html>`;
      const filePath = path.join(rootDir, source);
      const htmlPath = path.join(tempDir, `${basename}.html`);
      await fs.writeFile(htmlPath, html, 'utf8');
      await upload(filePath, key);
      await upload(htmlPath, htmlKey);
    }
    await fs.remove(tempDir);
  } catch(err) {
    console.error(err);
    process.exit(1);
  }
})();
