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

    // Ensure writing directory exists
    await fs.ensureDir('dist/writing');

    // Move any existing blog content to writing directory
    if (await fs.pathExists('dist/blog')) {
        await fs.move('dist/blog', 'dist/writing', { overwrite: true });
    }

    // Build blog posts and get the posts array
    const posts = await buildBlogPosts();
    
    // Build the writing index page
    await buildWritingPage(posts);
}

async function buildBlogPosts() {
    const writingDir = 'src/content/writing';
    const writingFiles = await fs.readdir(writingDir);
    const posts = [];
    
    for (const file of writingFiles) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(writingDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked(body);
            
            // Format the date
            const date = new Date(attributes.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            // Store complete post data for the index
            posts.push({
                title: attributes.title,
                date: attributes.date,
                formattedDate: formattedDate,
                author: attributes.author || 'Mark McCoy',
                slug: file.replace('.md', ''),
                description: attributes.description || '',
                image: attributes.image || '',
                imageAlt: attributes.imageAlt || '',
                tags: attributes.tags || []
            });

            // Get writing template
            const template = await fs.readFile('templates/writing-post.html', 'utf-8');
            
            // Add current year for copyright
            const currentYear = new Date().getFullYear();
            
            // Replace template variables in writing post template first
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

            // Handle description conditional
            if (attributes.description) {
                postContent = postContent.replace(/\[\[#if description\]\]([\s\S]*?)\[\[\/if\]\]/g, '$1');
            } else {
                postContent = postContent.replace(/\[\[#if description\]\]([\s\S]*?)\[\[\/if\]\]/g, '');
            }
            
            // Handle conditionals
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
                .replace(/\{\{copyright\}\}/g, 'Fas Labs Ltd')
                .replace(/href="\/blog/g, 'href="/writing');
            
            // Create writing directory if it doesn't exist
            await fs.ensureDir('dist/writing');
            
            // Write output file
            const outputPath = path.join('dist/writing', file.replace('.md', '.html'));
            await fs.writeFile(outputPath, finalHtml);
        }
    }
    
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function buildWritingPage(posts) {
    // Get unique tags from all posts
    const uniqueTags = [...new Set(posts.flatMap(post => post.tags))].sort();
    
    // Get writing template
    const writingTemplate = await fs.readFile('templates/writing.html', 'utf-8');
    
    // Replace template variables
    let writingContent = writingTemplate
        .replace(/\[\[#each uniqueTags\]\]([\s\S]*?)\[\[\/each\]\]/g, 
            uniqueTags.map(tag => 
                `<li><a href="/tags/${tag.toLowerCase()}" class="tag">${tag}</a></li>`
            ).join('\n')
        );

    // Replace posts loop with complete post data
    writingContent = writingContent.replace(/\[\[#each posts\]\]([\s\S]*?)\[\[\/each\]\]/g,
        posts.map(post => `
            <a href="/writing/${post.slug}" class="blog-card">
                ${post.image ? `
                <img 
                    src="${post.image}"
                    alt="${post.imageAlt}"
                    class="blog-card-image"
                    loading="lazy"
                >` : ''}
                <div class="blog-card-content">
                    <h2>${post.title}</h2>
                    <div class="blog-card-meta">
                        <time datetime="${post.date}">${post.formattedDate}</time>
                        · ${post.author}
                    </div>
                    ${post.description ? `
                    <p class="blog-card-description">${post.description}</p>
                    ` : ''}
                </div>
            </a>
        `).join('\n')
    );

    // Add to base template
    const currentYear = new Date().getFullYear();
    const finalHtml = baseTemplate
        .replace('{{content}}', writingContent)
        .replace(/\{\{title\}\}/g, 'Writing')
        .replace(/\{\{currentYear\}\}/g, currentYear)
        .replace(/\{\{copyright\}\}/g, 'Fas Labs Ltd');

    // Write the file
    await fs.writeFile('dist/writing.html', finalHtml);
}

// Modify the last line to call both functions
Promise.all([buildSite(), buildBlogPosts()])
    .then(() => console.log('Build completed successfully'))
    .catch(console.error);