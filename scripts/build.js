const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

async function buildSite() {
    // Create dist directory
    await fs.ensureDir('dist');

    // Copy static assets
    await fs.copy('src/assets', 'dist', { overwrite: true });

    // Ensure the js directory exists in dist
    await fs.ensureDir('dist/js');
    
    // Copy JavaScript files
    await fs.copy('src/assets/js', 'dist/js', { overwrite: true });

    // Build pages
    const pagesDir = 'src/content/pages';
    const files = await fs.readdir(pagesDir);
    
    for (const file of files) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(pagesDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked(body);
            
            // Get base template
            const template = await fs.readFile('templates/base.html', 'utf-8');
            
            // Simple template replacement
            const finalHtml = template
                .replace('{{title}}', attributes.title || 'My Site')
                .replace('{{content}}', html);
            
            // Write output file
            const outputPath = path.join('dist', file.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
        }
    }
}

buildSite().catch(console.error); 