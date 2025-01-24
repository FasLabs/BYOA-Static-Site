const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

// Move baseTemplate declaration outside both functions
let baseTemplate;

async function buildSite() {
    // Create dist directory
    await fs.ensureDir('dist');
    
    // Load base template first
    baseTemplate = await fs.readFile('templates/base-layout.html', 'utf-8');

    // Copy static assets
    await fs.copy('src/assets', 'dist', { overwrite: true });

    // Ensure directories exist
    await fs.ensureDir('dist/js');
    await fs.ensureDir('dist/images');
    
    // Copy assets
    await fs.copy('src/assets/js', 'dist/js', { overwrite: true });
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
            
            // Add current year for copyright
            const currentYear = new Date().getFullYear();
            
            // Replace template variables
            let finalHtml = baseTemplate
                .replace('{{content}}', template.replace('{{content}}', html))
                .replace(/\{\{title\}\}/g, attributes.title || 'My Site')
                .replace(/\{\{headline\}\}/g, attributes.headline || '')
                .replace(/\{\{description\}\}/g, attributes.description || '')
                .replace(/\{\{heroImage\}\}/g, attributes.heroImage || '')
                .replace(/\{\{copyright\}\}/g, attributes.copyright || 'Fas Labs Ltd')
                .replace(/\{\{currentYear\}\}/g, currentYear);
            
            // Handle conditionals
            if (attributes.subtitle) {
                finalHtml = finalHtml.replace(/\[\[#if subtitle\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                finalHtml = finalHtml.replace(/\[\[#if subtitle\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }

            if (attributes.description) {
                finalHtml = finalHtml.replace(/\[\[#if description\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                finalHtml = finalHtml.replace(/\[\[#if description\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }
            
            // Handle tags
            if (attributes.tags && Array.isArray(attributes.tags)) {
                const tagsHtml = attributes.tags
                    .map(tag => `<a href="/tags/${tag.toLowerCase()}" class="tag">${tag}</a>`)
                    .join('');
                finalHtml = finalHtml.replace(/\[\[#each tags\]\]([\s\S]*?)\[\[\/each\]\]/g, tagsHtml);
            } else {
                finalHtml = finalHtml.replace(/\[\[#each tags\]\]([\s\S]*?)\[\[\/each\]\]/g, '');
            }
            
            // Write output file
            const outputPath = path.join('dist', file.replace('.md', '.html'));
            await fs.outputFile(outputPath, finalHtml);
        }
    }
}

async function buildBlogPosts() {
    const blogDir = 'src/content/blog';
    const blogFiles = await fs.readdir(blogDir);
    const posts = [];
    
    for (const file of blogFiles) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(blogDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked(body);
            
            // Get blog template
            const template = await fs.readFile('templates/blog-post.html', 'utf-8');
            
            // Format the date
            const date = new Date(attributes.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Store post data for the index
            posts.push({
                title: attributes.title,
                date: date,
                slug: file.replace('.md', ''),
                excerpt: attributes.excerpt || '',
                tags: attributes.tags || []
            });

            // Add current year for copyright
            const currentYear = new Date().getFullYear();
            
            // Replace template variables in blog post template first
            let postContent = template
                .replace(/\[\[title\]\]/g, attributes.title || '')
                .replace(/\[\[subtitle\]\]/g, attributes.subtitle || '')
                .replace(/\[\[description\]\]/g, attributes.description || '')
                .replace(/\[\[date\]\]/g, attributes.date || '')
                .replace(/\[\[formattedDate\]\]/g, formattedDate)
                .replace(/\[\[author\]\]/g, attributes.author || '')
                .replace(/\[\[content\]\]/g, html)
                .replace(/\[\[image\]\]/g, attributes.image || '')
                .replace(/\[\[imageAlt\]\]/g, attributes.imageAlt || '')
                .replace(/\[\[imageCaption\]\]/g, attributes.imageCaption || '');

            // Handle image conditional
            if (attributes.image) {
                postContent = postContent.replace(/\[\[#if image\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                postContent = postContent.replace(/\[\[#if image\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }

            // Handle image caption conditional
            if (attributes.imageCaption) {
                postContent = postContent.replace(/\[\[#if imageCaption\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                postContent = postContent.replace(/\[\[#if imageCaption\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }

            // Handle conditionals
            if (attributes.subtitle) {
                postContent = postContent.replace(/\[\[#if subtitle\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                postContent = postContent.replace(/\[\[#if subtitle\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }

            if (attributes.description) {
                postContent = postContent.replace(/\[\[#if description\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                postContent = postContent.replace(/\[\[#if description\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }
            
            // Handle tags
            if (attributes.tags && Array.isArray(attributes.tags)) {
                const tagsHtml = attributes.tags
                    .map(tag => `<a href="/tags/${tag.toLowerCase()}" class="tag">${tag}</a>`)
                    .join('');
                postContent = postContent.replace(/\[\[#each tags\]\]([\s\S]*?)\[\[\/each\]\]/g, tagsHtml);
            } else {
                postContent = postContent.replace(/\[\[#each tags\]\]([\s\S]*?)\[\[\/each\]\]/g, '');
            }

            // Now replace variables in base template
            let finalHtml = baseTemplate
                .replace('{{content}}', postContent)
                .replace(/\{\{title\}\}/g, attributes.title || '')
                .replace(/\{\{currentYear\}\}/g, currentYear)
                .replace(/\{\{copyright\}\}/g, 'Fas Labs Ltd');
            
            // Create blog directory if it doesn't exist
            await fs.ensureDir('dist/blog');
            
            // Write output file
            const outputPath = path.join('dist/blog', file.replace('.md', '.html'));
            await fs.writeFile(outputPath, finalHtml);
        }
    }
    
    return posts.sort((a, b) => b.date - a.date);
}

// Modify the last line to call both functions
Promise.all([buildSite(), buildBlogPosts()])
    .then(() => console.log('Build completed successfully'))
    .catch(console.error);