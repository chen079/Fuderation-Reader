const { minify } = require('terser');
const fs = require('fs');
const path = require('path');

const jsFiles = ['db.js', 'markdown-custom.js', 'markdown-base.js', 'ui-kit.js', 'app.js'];
const srcDir = path.join(__dirname, 'js');
const distDir = path.join(__dirname, 'dist', 'js');

async function build() {
    // 合并所有 JS 文件
    let combined = '';
    for (const file of jsFiles) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
        combined += content + '\n';
    }

    // 混淆压缩
    const result = await minify(combined, {
        compress: {
            drop_console: false,
            passes: 2
        },
        mangle: {
            toplevel: false, // 保留顶层变量名（MarkdownCustom 等需要全局访问）
            properties: false
        },
        format: {
            comments: false
        }
    });

    // 写入单个文件
    fs.writeFileSync(path.join(distDir, 'bundle.min.js'), result.code);
    console.log('Built: dist/js/bundle.min.js');

    // 复制 CSS
    fs.copyFileSync(
        path.join(__dirname, 'css', 'style.css'),
        path.join(__dirname, 'dist', 'css', 'style.css')
    );
    console.log('Copied: dist/css/style.css');

    // 生成生产版 HTML
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    // 替换多个 JS 引用为单个 bundle
    html = html.replace(
        /<script src="js\/db\.js"><\/script>\s*<script src="js\/markdown-custom\.js"><\/script>\s*<script src="js\/markdown-base\.js"><\/script>\s*<script src="js\/ui-kit\.js"><\/script>/,
        ''
    );
    html = html.replace(
        /<script src="js\/app\.js"><\/script>/,
        '<script src="js/bundle.min.js"></script>'
    );

    fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), html);
    console.log('Built: dist/index.html');

    // 创建 CNAME 文件（自定义域名需要）
    fs.writeFileSync(path.join(__dirname, 'dist', 'CNAME'), 'reader.fuderation.com');
    console.log('Created: dist/CNAME');

    console.log('\nBuild complete! Deploy the dist/ folder.');
}

build().catch(console.error);
