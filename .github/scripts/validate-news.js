#!/usr/bin/env node
// 校验 News/data/news.json 的格式与必填字段。
// 由 GitHub Actions 在部署前调用；本地也可 `node .github/scripts/validate-news.js` 自查。
// 退出码非 0 会让部署中断，避免格式错误的新闻被发布上线。
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');       // 仓库根（ToGithub）
const DATA_FILE = path.join(ROOT, 'News', 'data', 'news.json');
const PHOTO_BASE = path.join(ROOT, 'News');             // photos 路径相对 News/

const errors = [];

function fail(msg) { errors.push(msg); }

let data;
try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    data = JSON.parse(raw);
} catch (e) {
    console.error('✖ 无法解析 News/data/news.json：' + e.message);
    process.exit(1);
}

if (!data || typeof data !== 'object') {
    fail('根节点必须是一个对象');
} else {
    if (!Array.isArray(data.items)) {
        fail('缺少 items 数组');
    } else {
        data.items.forEach(function (item, idx) {
            const at = 'items[' + idx + ']';
            if (!item || typeof item !== 'object') { fail(at + ' 必须是对象'); return; }

            ['date', 'title', 'desc'].forEach(function (k) {
                if (typeof item[k] !== 'string' || !item[k].trim()) {
                    fail(at + ' 缺少必填字段 "' + k + '"（非空字符串）');
                }
            });

            if (typeof item.date === 'string' &&
                !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
                fail(at + '.date 格式应为 YYYY-MM-DD，实际为 "' + item.date + '"');
            }

            if (item.note !== undefined && typeof item.note !== 'string') {
                fail(at + '.note 必须是字符串');
            }

            if (item.action !== undefined) {
                if (!item.action || typeof item.action !== 'object') {
                    fail(at + '.action 必须是对象');
                } else if (typeof item.action.href !== 'string' || !item.action.href.trim()) {
                    fail(at + '.action.href 必填且为非空字符串');
                }
            }

            if (item.photos !== undefined) {
                if (!Array.isArray(item.photos)) {
                    fail(at + '.photos 必须是数组');
                } else {
                    item.photos.forEach(function (p, j) {
                        const pAt = at + '.photos[' + j + ']';
                        if (typeof p !== 'string' || !p.trim()) {
                            fail(pAt + ' 必须是非空字符串');
                            return;
                        }
                        const abs = path.join(PHOTO_BASE, p);
                        if (!fs.existsSync(abs)) {
                            fail(pAt + ' 指向的图片不存在：News/' + p);
                        }
                    });
                }
            }
        });
    }
}

if (errors.length) {
    console.error('✖ news.json 校验未通过，共 ' + errors.length + ' 处问题：');
    errors.forEach(function (e) { console.error('  - ' + e); });
    process.exit(1);
}

console.log('✔ news.json 校验通过，共 ' + data.items.length + ' 条动态。');
