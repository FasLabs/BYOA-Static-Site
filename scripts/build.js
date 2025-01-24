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
    const postsDir = 'src/content/blog';
    const posts = [];
    const uniqueTags = new Set();

    // Read all blog posts
    const files = await fs.readdir(postsDir);
    
    for (const file of files) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(postsDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            
            // Collect unique tags
            if (attributes.tags) {
                attributes.tags.forEach(tag => uniqueTags.add(tag));
            }
            
            // Add to posts array
            posts.push({
                ...attributes,
                slug: file.replace('.md', ''),
                content: marked(body),
                formattedDate: new Date(attributes.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
            });
        }
    }

    // Sort posts by date
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Build the blog index page
    await buildBlogIndex(posts, uniqueTags);
}

async function buildBlogIndex(posts, uniqueTags) {
    // Load templates
    const baseTemplate = await fs.readFile('templates/base-layout.html', 'utf-8');
    const blogTemplate = await fs.readFile('templates/blog.html', 'utf-8');
    
    // Replace posts in template
    let blogContent = blogTemplate.replace(/\[\[#each posts\]\]([\s\S]*?)\[\[\/each\]\]/g, 
        posts.map(post => {
            let postTemplate = `
                <a href="/blog/${post.slug}" class="blog-card">
                    ${post.image ? `
                        <img 
                            src="${post.image}" 
                            alt="${post.imageAlt || ''}" 
                            class="blog-card-image"
                            loading="lazy"
                        >
                    ` : ''}
                    <div class="blog-card-content">
                        <h2>${post.title}</h2>
                        <div class="blog-card-meta">
                            <time datetime="${post.date}">${post.formattedDate}</time>
                            · ${post.author}
                        </div>
                        <p class="blog-card-description">${post.description || ''}</p>
                    </div>
                </a>
            `;
            return postTemplate;
        }).join('')
    );

    // Replace tags in template
    blogContent = blogContent.replace(/\[\[#each uniqueTags\]\]([\s\S]*?)\[\[\/each\]\]/g,
        Array.from(uniqueTags).map(tag => `
            <li>
                <a href="/tags/${tag.toLowerCase()}" class="tag">${tag}</a>
            </li>
        `).join('')
    );

    // Insert into base template
    const finalHtml = baseTemplate
        .replace('{{content}}', blogContent)
        .replace('{{title}}', 'Articles')
        .replace('{{currentYear}}', new Date().getFullYear())
        .replace('{{copyright}}', 'Fas Labs Ltd');

    // Write the file
    await fs.outputFile('dist/blog/index.html', finalHtml);
}

// Modify the last line to call both functions
Promise.all([buildSite(), buildBlogPosts()])
    .then(() => console.log('Build completed successfully'))
    .catch(console.error);