import { bundledLanguages, bundledThemes, codeToHtml } from 'https://esm.sh/shiki@4.4.3'

const FALLBACK_THEMES = {
    light: 'one-light',
    dark: 'one-dark-pro'
}

const LEGACY_THEME_ALIASES = {
    'one-dark': 'one-dark-pro',
    'a11y-dark': 'github-dark-high-contrast',
    'atom-dark': 'one-dark-pro',
    'base16-ateliersulphurpool.light': 'solarized-light',
    'cb': 'dark-plus',
    'coldark-cold': 'github-light',
    'coldark-dark': 'github-dark',
    'coy-without-shadows': 'github-light',
    'darcula': 'material-theme-darker',
    'duotone-dark': 'min-dark',
    'duotone-earth': 'rose-pine',
    'duotone-forest': 'everforest-dark',
    'duotone-light': 'min-light',
    'duotone-sea': 'material-theme-ocean',
    'duotone-space': 'poimandres',
    'ghcolors': 'github-light',
    'gruvbox-dark': 'gruvbox-dark-medium',
    'gruvbox-light': 'gruvbox-light-medium',
    'holi-theme': 'synthwave-84',
    'hopscotch': 'rose-pine',
    'lucario': 'min-dark',
    'material-dark': 'material-theme-darker',
    'material-light': 'material-theme-lighter',
    'material-oceanic': 'material-theme-ocean',
    'pojoaque': 'monokai',
    'shades-of-purple': 'synthwave-84',
    'solarized-dark-atom': 'solarized-dark',
    'synthwave84': 'synthwave-84',
    'vs': 'light-plus',
    'vsc-dark-plus': 'dark-plus',
    'xonokai': 'monokai',
    'z-touch': 'min-light'
}

const LANGUAGE_ALIASES = {
    'c++': 'cpp',
    'c#': 'csharp',
    'htm': 'html',
    'md': 'markdown',
    'vue-html': 'vue'
}

const LANGUAGE_LABELS = {
    bash: 'Bash',
    csharp: 'C#',
    cpp: 'C++',
    css: 'CSS',
    html: 'HTML',
    javascript: 'JavaScript',
    json: 'JSON',
    jsx: 'JSX',
    markdown: 'Markdown',
    shellscript: 'Shell',
    typescript: 'TypeScript',
    tsx: 'TSX',
    vue: 'Vue',
    xml: 'XML',
    yaml: 'YAML'
}

let renderQueue = Promise.resolve()
let commentObserver
let observerQueued = false

function getConfig() {
    return window.GLOBAL_CONFIG && window.GLOBAL_CONFIG.shiki
        ? window.GLOBAL_CONFIG.shiki
        : { enable: false }
}

function normalizeTheme(theme, mode) {
    const requested = LEGACY_THEME_ALIASES[theme] || theme
    return requested && bundledThemes[requested] ? requested : FALLBACK_THEMES[mode]
}

function getThemes() {
    const config = getConfig()
    return {
        light: normalizeTheme(config.theme_light, 'light'),
        dark: normalizeTheme(config.theme_dark, 'dark')
    }
}

function extractLanguage(pre, code) {
    const classNames = `${code.className || ''} ${pre.className || ''}`
    const classMatch = classNames.match(/(?:lang|language)-([^\s]+)/i)
    const declared = classMatch && classMatch[1]
        ? classMatch[1]
        : code.dataset.language || pre.dataset.language || 'text'
    return declared.toLowerCase()
}

function normalizeLanguage(language) {
    const aliased = LANGUAGE_ALIASES[language] || language
    if (['text', 'txt', 'plain', 'plaintext'].includes(aliased)) return 'text'
    return bundledLanguages[aliased] ? aliased : 'text'
}

function languageLabel(language, normalizedLanguage, pre, code) {
    const customTitle = code.dataset.title || pre.dataset.title
    if (customTitle) return customTitle
    return LANGUAGE_LABELS[normalizedLanguage]
        || LANGUAGE_LABELS[language]
        || (language === 'text' ? 'Text' : language)
}

function createButton(className, iconClass, label) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.title = label
    button.setAttribute('aria-label', label)

    const icon = document.createElement('i')
    icon.className = iconClass
    button.appendChild(icon)
    return button
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const copied = document.execCommand('copy')
    textArea.remove()
    return copied
}

async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return true
    }
    return fallbackCopyText(text)
}

function notify(message) {
    if (window.btf && typeof window.btf.snackbarShow === 'function') {
        window.btf.snackbarShow(message)
    }
}

function addCopyButton(actions, source) {
    const button = createButton(
        'shiki-tool shiki-copy-button',
        'haofont hao-icon-paste',
        '复制代码'
    )

    button.addEventListener('click', async () => {
        try {
            const copied = await copyText(source)
            if (!copied) throw new Error('Copy command failed')
            button.dataset.copyState = 'success'
            button.title = '复制成功'
            notify('复制成功')
        } catch (error) {
            button.dataset.copyState = 'error'
            button.title = '复制失败，请手动复制'
            notify('复制失败，请手动复制')
            console.error('[Shiki] Failed to copy code.', error)
        }

        window.setTimeout(() => {
            delete button.dataset.copyState
            button.title = '复制代码'
        }, 2000)
    })

    actions.appendChild(button)
}

function addCollapseButton(actions, wrapper) {
    const button = createButton(
        'shiki-tool shiki-collapse-button',
        'haofont hao-icon-angle-down',
        '折叠代码'
    )
    button.setAttribute('aria-expanded', 'true')

    button.addEventListener('click', () => {
        const collapsed = wrapper.classList.toggle('is-code-collapsed')
        button.setAttribute('aria-expanded', String(!collapsed))
        button.title = collapsed ? '展开代码' : '折叠代码'
    })

    actions.appendChild(button)
}

function addHeightLimit(wrapper, pre) {
    const config = getConfig()
    if (!config.enable_height_limit) return

    const heightLimit = Number(config.height_limit) || 300
    if (pre.scrollHeight <= heightLimit) return

    wrapper.classList.add('is-height-limited')
    const button = createButton(
        'code-expand-btn',
        'haofont hao-icon-angle-double-down',
        '展开完整代码'
    )

    button.addEventListener('click', () => {
        const expanded = wrapper.classList.toggle('is-height-expanded')
        button.classList.toggle('expand-done', expanded)
        button.title = expanded ? '收起代码' : '展开完整代码'
        button.setAttribute('aria-expanded', String(expanded))
    })

    button.setAttribute('aria-expanded', 'false')
    wrapper.appendChild(button)
}

function buildCodeBlock(pre, highlightedPre, source, title) {
    const config = getConfig()
    const wrapper = document.createElement('div')
    wrapper.className = 'code-toolbar shiki-code-block'

    if (config.enable_line) highlightedPre.classList.add('line-numbers')

    const toolbar = document.createElement('div')
    toolbar.className = 'toolbar'
    if (config.enable_title) toolbar.classList.add('c-title')
    if (config.enable_hr) toolbar.classList.add('c-hr')

    const titleItem = document.createElement('div')
    titleItem.className = 'toolbar-item shiki-language-title'
    const titleText = document.createElement('span')
    titleText.textContent = title
    titleItem.appendChild(titleText)
    toolbar.appendChild(titleItem)

    const actions = document.createElement('div')
    actions.className = 'custom-item shiki-toolbar-actions'
    if (config.enable_copy) addCopyButton(actions, source)
    if (config.enable_expander) addCollapseButton(actions, wrapper)
    toolbar.appendChild(actions)

    wrapper.appendChild(highlightedPre)
    wrapper.appendChild(toolbar)
    pre.replaceWith(wrapper)

    window.requestAnimationFrame(() => addHeightLimit(wrapper, highlightedPre))
}

async function renderCodeBlock(code) {
    const pre = code.parentElement
    if (!pre || pre.tagName !== 'PRE' || pre.classList.contains('shiki')) return
    if (pre.closest('.shiki-code-block') || code.dataset.shikiPending === 'true') return

    code.dataset.shikiPending = 'true'
    const source = code.textContent || ''
    const language = extractLanguage(pre, code)
    const normalizedLanguage = normalizeLanguage(language)
    const themes = getThemes()

    try {
        const html = await codeToHtml(source, {
            lang: normalizedLanguage,
            themes,
            defaultColor: false
        })
        const template = document.createElement('template')
        template.innerHTML = html.trim()
        const highlightedPre = template.content.querySelector('pre.shiki')
        if (!highlightedPre) throw new Error('Shiki did not return a code block')

        highlightedPre.dataset.shikiRendered = 'true'
        highlightedPre.dataset.language = language
        highlightedPre.classList.add(`language-${language.replace(/[^a-z0-9_+#.-]/g, '')}`)
        const highlightedCode = highlightedPre.querySelector('code')
        if (highlightedCode) highlightedCode.classList.add(`language-${normalizedLanguage}`)

        buildCodeBlock(
            pre,
            highlightedPre,
            source,
            languageLabel(language, normalizedLanguage, pre, code)
        )
    } catch (error) {
        delete code.dataset.shikiPending
        console.error(`[Shiki] Failed to highlight language "${language}".`, error)
    }
}

async function highlightAll(container = document) {
    const config = getConfig()
    if (!config.enable || !container) return

    const root = container.querySelectorAll ? container : document
    const codeBlocks = Array.from(root.querySelectorAll(
        '#article-container pre > code, #post-comment pre > code, pre[data-language] > code'
    ))

    for (const code of codeBlocks) {
        await renderCodeBlock(code)
    }
}

function scheduleHighlight(container = document) {
    renderQueue = renderQueue
        .then(() => highlightAll(container))
        .catch(error => console.error('[Shiki] Failed to render code blocks.', error))
    return renderQueue
}

function observeCommentCode() {
    if (commentObserver) commentObserver.disconnect()
    const comments = document.getElementById('post-comment')
    if (!comments) return

    commentObserver = new MutationObserver(mutations => {
        const containsCode = mutations.some(mutation => Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false
            return node.matches('pre, code') || node.querySelector('pre > code')
        }))
        if (!containsCode || observerQueued) return

        observerQueued = true
        queueMicrotask(() => {
            observerQueued = false
            scheduleHighlight(comments)
        })
    })
    commentObserver.observe(comments, { childList: true, subtree: true })
}

function initialize() {
    scheduleHighlight(document)
    observeCommentCode()
}

window.haloShiki = Object.freeze({
    highlightAll: scheduleHighlight
})

document.addEventListener('DOMContentLoaded', initialize, { once: true })
document.addEventListener('pjax:complete', initialize)
