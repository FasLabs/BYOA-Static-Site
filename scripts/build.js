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

    // Ensure the images directory exists in dist
    await fs.ensureDir('dist/images');
    await fs.copy('src/assets/images', 'dist/images', { overwrite: true });

    // Build pages
    const pagesDir = 'src/content/pages';
    const files = await fs.readdir(pagesDir);
    
    for (const file of files) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(pagesDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked(body);
            
            // Use index template for index.md, base template for others
            const templatePath = file === 'index.md' ? 'templates/index.html' : 'templates/base.html';
            const template = await fs.readFile(templatePath, 'utf-8');
            
            // Read partials
            const header = await fs.readFile('templates/partials/header.html', 'utf-8');
            const footer = await fs.readFile('templates/partials/footer.html', 'utf-8');
            
            // Add current year for copyright
            const currentYear = new Date().getFullYear();
            
            // Simple template replacement
            let finalHtml = template
                .replace('{{header}}', header)
                .replace('{{footer}}', footer)
                .replace(/\{\{title\}\}/g, attributes.title || 'My Site')
                .replace(/\{\{headline\}\}/g, attributes.headline || '')
                .replace(/\{\{description\}\}/g, attributes.description || '')
                .replace(/\{\{heroImage\}\}/g, attributes.heroImage || '')
                .replace(/\{\{copyright\}\}/g, attributes.copyright || 'Fas Labs Ltd')
                .replace(/\{\{currentYear\}\}/g, currentYear)
                .replace(/\{\{content\}\}/g, html);
            
            // Write output file
            const outputPath = path.join('dist', file.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
        }
    }

    // Build blog posts
    const blogDir = 'src/content/blog';
    const blogFiles = await fs.readdir(blogDir);
    
    // Read partials once
    const header = await fs.readFile('templates/partials/header.html', 'utf-8');
    const footer = await fs.readFile('templates/partials/footer.html', 'utf-8');
    
    for (const file of blogFiles) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked(body);
            
            // Get blog template
            const template = await fs.readFile('templates/blog-post.html', 'utf-8');
            
            // Format the date
            const formattedDate = new Date(attributes.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Replace template variables
            let finalHtml = template
                .replace('{{header}}', header)
                .replace('{{footer}}', footer)
                .replace(/\{\{title\}\}/g, attributes.title || '')
                .replace(/\{\{subtitle\}\}/g, attributes.subtitle || '')
                .replace(/\{\{description\}\}/g, attributes.description || '')
                .replace(/\{\{date\}\}/g, attributes.date || '')
                .replace(/\{\{formattedDate\}\}/g, formattedDate || '')
                .replace(/\{\{image\}\}/g, attributes.image || '')
                .replace(/\{\{content\}\}/g, html);
            
            // Handle tags
            if (attributes.tags && Array.isArray(attributes.tags)) {
                const tagsHtml = attributes.tags
                    .map(tag => `<a href="/tags/${tag.toLowerCase()}" class="tag">${tag}</a>`)
                    .join(' ');
                finalHtml = finalHtml.replace(/\{\{tags\}\}/g, tagsHtml);
            } else {
                finalHtml = finalHtml.replace(/\{\{tags\}\}/g, '');
            }
            
            // Create blog directory if it doesn't exist
            await fs.ensureDir('dist/blog');
            
            // Write output file
            const outputPath = path.join('dist/blog', file.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
        }
    }
}

buildSite().catch(console.error); 