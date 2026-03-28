import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { getContext, extension_settings } from '../../../extensions.js';
import { generateTextGenWithStreaming, getTextGenGenerationData } from '../../../textgen-settings.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js';

const EXTENSION_NAME = import.meta.url.split('/').slice(-2)[0];

// ===================== ЯЗЫКИ =====================
const LANGUAGES = {
    ru: {
        name: 'Русский',
        promptName: 'русский',
        check: { enabled: true, minUniqueWords: 3, minRatio: 0.05, wordPattern: /^[a-zA-Z]+$/ },
        defaultPrompt: 'Переведи части текста на {{language}}, оставив уже написанное на {{language}} без изменений. Все слова переводи полностью, никаких гибридных слов. Только один вариант перевода, без альтернатив, комментариев, примечаний и пояснений. Сохраняй форматирование исходного сообщения.',
        ui: { apply: 'Применить', retry: 'Повторить', close: 'Закрыть' },
    },
    uk: {
        name: 'Українська',
        promptName: 'українська',
        check: { enabled: true, minUniqueWords: 3, minRatio: 0.05, wordPattern: /^[a-zA-Z]+$/ },
        defaultPrompt: 'Перекладіть частини тексту на {{language}}, залишивши вже написане на {{language}} без змін. Лише один варіант перекладу, без альтернатив та коментарів. Зберігайте форматування.',
        ui: { apply: 'Застосувати', retry: 'Повторити', close: 'Закрити' },
    },
    be: {
        name: 'Беларуская',
        promptName: 'беларуская',
        check: { enabled: true, minUniqueWords: 3, minRatio: 0.05, wordPattern: /^[a-zA-Z]+$/ },
        defaultPrompt: 'Перакладзіце часткі тэксту на {{language}}, пакінуўшы ўжо напісанае на {{language}} без змен. Толькі адзін варыянт, без альтэрнатыў і каментарыяў. Захоўвайце фарматаванне.',
        ui: { apply: 'Ужыць', retry: 'Паўтарыць', close: 'Зачыніць' },
    },
    kk: {
        name: 'Қазақша',
        promptName: 'қазақ',
        check: { enabled: true, minUniqueWords: 3, minRatio: 0.05, wordPattern: /^[a-zA-Z]+$/ },
        defaultPrompt: 'Мәтіннің бөліктерін {{language}} тіліне аударыңыз, {{language}} тілінде жазылғандарын өзгертпеңіз. Тек бір нұсқа, баламасыз және түсіндірмесіз. Пішімдеуді сақтаңыз.',
        ui: { apply: 'Қолдану', retry: 'Қайталау', close: 'Жабу' },
    },
    bg: {
        name: 'Български',
        promptName: 'български',
        check: { enabled: true, minUniqueWords: 5, minRatio: 0.1, wordPattern: /^[a-zA-Z]+$/ },
        defaultPrompt: 'Преведете частите на текста на {{language}}, оставяйки вече написаното на {{language}} непроменено. Само един вариант, без алтернативи и коментари. Запазете форматирането.',
        ui: { apply: 'Приложи', retry: 'Опитай пак', close: 'Затвори' },
    },
    sr: {
        name: 'Српски',
        promptName: 'српски',
        check: { enabled: false },
        defaultPrompt: 'Преведите делове текста на {{language}}, остављајући већ написано на {{language}} непромењеним. Само jedna varijanta, bez alternativa i komentara. Sačuvajte formatiranje.',
        ui: { apply: 'Примени', retry: 'Покушај поново', close: 'Затвори' },
    },
    de: {
        name: 'Deutsch',
        promptName: 'Deutsch',
        check: { enabled: false },
        defaultPrompt: 'Übersetze die nicht-deutschen Teile des Textes ins {{language}}, lasse bereits auf {{language}} geschriebenes unverändert. Nur eine Variante, keine Alternativen oder Kommentare. Behalte die Formatierung bei.',
        ui: { apply: 'Anwenden', retry: 'Wiederholen', close: 'Schließen' },
    },
    fr: {
        name: 'Français',
        promptName: 'français',
        check: { enabled: false },
        defaultPrompt: 'Traduisez les parties non françaises du texte en {{language}}, en laissant ce qui est déjà en {{language}} inchangé. Une seule variante, sans alternatives ni commentaires. Conservez la mise en forme.',
        ui: { apply: 'Appliquer', retry: 'Réessayer', close: 'Fermer' },
    },
    es: {
        name: 'Español',
        promptName: 'español',
        check: { enabled: false },
        defaultPrompt: 'Traduce las partes no españolas del texto al {{language}}, dejando lo ya escrito en {{language}} sin cambios. Solo una variante, sin alternativas ni comentarios. Conserva el formato.',
        ui: { apply: 'Aplicar', retry: 'Reintentar', close: 'Cerrar' },
    },
    it: {
        name: 'Italiano',
        promptName: 'italiano',
        check: { enabled: false },
        defaultPrompt: 'Traduci le parti non italiane del testo in {{language}}, lasciando invariato ciò che è già scritto in {{language}}. Solo una variante, senza alternative o commenti. Mantieni la formattazione.',
        ui: { apply: 'Applica', retry: 'Riprova', close: 'Chiudi' },
    },
    pl: {
        name: 'Polski',
        promptName: 'polski',
        check: { enabled: false },
        defaultPrompt: 'Przetłumacz niepolskie części tekstu na {{language}}, pozostawiając to, co jest już napisane po {{language}}, bez zmian. Tylko jeden wariant, bez alternatyw i komentarzy. Zachowaj formatowanie.',
        ui: { apply: 'Zastosuj', retry: 'Spróbuj ponownie', close: 'Zamknij' },
    },
    zh: {
        name: '中文',
        promptName: '中文',
        check: { enabled: false },
        defaultPrompt: '将文本中非中文的部分翻译成{{language}}，保留已经用{{language}}写的内容不变。只提供一种翻译，不要替代方案或注释。保留原始格式。',
        ui: { apply: '应用', retry: '重试', close: '关闭' },
    },
    ja: {
        name: '日本語',
        promptName: '日本語',
        check: { enabled: false },
        defaultPrompt: 'テキストの非日本語部分を{{language}}に翻訳し、すでに{{language}}で書かれている部分はそのままにしてください。代替案やコメントなしで、1つのバリアントのみ。書式を維持してください。',
        ui: { apply: '適用', retry: 'やり直す', close: '閉じる' },
    },
    ko: {
        name: '한국어',
        promptName: '한국어',
        check: { enabled: false },
        defaultPrompt: '텍스트의 비한국어 부분을 {{language}}로 번역하고, 이미 {{language}}로 작성된 부분은 그대로 두십시오. 대안이나 주석 없이 하나의 변형만. 서식을 유지하십시오.',
        ui: { apply: '적용', retry: '다시 시도', close: '닫기' },
    },
};

// ===================== НАСТРОЙКИ =====================
const DEFAULT_SETTINGS = {
    targetLanguage: 'ru',
    customPrompt: '',
    checkEnabled: true,
};

function getSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || { ...DEFAULT_SETTINGS };
    return extension_settings[EXTENSION_NAME];
}

function getLang() {
    return LANGUAGES[getSettings().targetLanguage] || LANGUAGES.ru;
}

function getPrompt() {
    const settings = getSettings();
    const lang = getLang();
    const prompt = settings.customPrompt || lang.defaultPrompt;
    return prompt.replace(/\{\{language\}\}/g, lang.promptName);
}

// ===================== ПРОВЕРКА =====================
function hasTextToTranslate(text) {
    const settings = getSettings();
    const lang = getLang();
    if (!lang.check.enabled || !settings.checkEnabled) return true;

    const clean = text.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return false;

    const foreignWords = new Set(
        words.filter(w => lang.check.wordPattern.test(w))
    );
    return foreignWords.size >= lang.check.minUniqueWords &&
           (foreignWords.size / words.length) >= lang.check.minRatio;
}

// ===================== ПЕРЕВОД =====================
async function translateText(text) {
    const prompt = `[SYSTEM_PROMPT]${getPrompt()}[/SYSTEM_PROMPT]\n[INST]${text}[/INST]`;
    const abortController = new AbortController();
    const generateData = await getTextGenGenerationData(prompt, 1500, false, false, null, 'quiet');
    generateData.stopping_strings = [];
    generateData.stop = [];
    const streamFn = await generateTextGenWithStreaming(generateData, abortController.signal);
    let result = '';
    for await (const chunk of streamFn()) {
        result = chunk.text;
    }
    return result.trim() || null;
}

// ===================== ПОПАП =====================
function buildPreview(original, translated) {
    const lang = getLang();
    return `
    <div style="max-height:60vh;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:0.9em;table-layout:fixed">
        <tr>
          <td style="padding:0 10px 8px 0;width:50%;color:#ff6b6b">● Оригинал</td>
          <td style="padding:0 0 8px 10px;width:50%;color:#6bff6b">● ${lang.name}</td>
        </tr>
        <tr>
          <td style="vertical-align:top;padding:0 10px 0 0;white-space:pre-wrap;font-style:italic">${original}</td>
          <td style="vertical-align:top;padding:0 0 0 10px;border-left:1px solid #444;white-space:pre-wrap;font-style:italic">${translated}</td>
        </tr>
      </table>
    </div>`;
}

function expandDialog() {
    setTimeout(() => {
        const dlg = document.querySelector('dialog[open]');
        if (dlg) { dlg.style.maxWidth = '90vw'; dlg.style.width = '900px'; }
    }, 50);
}

async function translateAndConfirm(message) {
    const ui = getLang().ui;
    let translated = await translateText(message.mes);
    if (!translated) throw new Error('Empty translation');

    while (true) {
        expandDialog();
        const result = await callGenericPopup(
            buildPreview(message.mes, translated),
            POPUP_TYPE.CONFIRM, '',
            {
                okButton: ui.apply,
                cancelButton: ui.retry,
                customButtons: [{ text: ui.close, result: 2, classes: [] }]
            }
        );

        if (result === 1) return translated;
        if (result === 2) return null;

        translated = await translateText(message.mes);
        if (!translated) throw new Error('Empty translation');
    }
}

// ===================== UI НАСТРОЕК =====================
function renderSettings() {
    const settings = getSettings();
    const lang = getLang();

    const langOptions = Object.entries(LANGUAGES)
        .map(([code, l]) => `<option value="${code}" ${code === settings.targetLanguage ? 'selected' : ''}>${l.name}</option>`)
        .join('');

    const checkboxHtml = lang.check.enabled ? `
        <div style="margin-top:8px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="translate-ru-check" ${settings.checkEnabled ? 'checked' : ''}>
                Проверять наличие текста для перевода
            </label>
        </div>` : '';

    const html = `
        <div style="padding:10px 0">
            <label style="display:block;margin-bottom:4px">Целевой язык</label>
            <select id="translate-ru-lang" style="width:100%;padding:4px;background:var(--black70);color:var(--SmartThemeBodyColor);border:1px solid var(--SmartThemeBorderColor)">
                ${langOptions}
            </select>
            ${checkboxHtml}
            <label style="display:block;margin-top:12px;margin-bottom:4px">Промпт перевода</label>
            <textarea id="translate-ru-prompt"
                placeholder="${lang.defaultPrompt}"
                style="width:100%;height:100px;padding:4px;background:var(--black70);color:var(--SmartThemeBodyColor);border:1px solid var(--SmartThemeBorderColor);resize:vertical;box-sizing:border-box"
            >${settings.customPrompt}</textarea>
            <div style="font-size:0.8em;color:#888;margin-top:4px">Плейсхолдеры: <code>{{language}}</code>, <code>{{text}}</code></div>
        </div>`;

    const container = document.querySelector('#translate-ru-settings');
    if (container) container.innerHTML = html;

    document.querySelector('#translate-ru-lang')?.addEventListener('change', (e) => {
        settings.targetLanguage = e.target.value;
        saveSettingsDebounced();
        renderSettings();
    });

    document.querySelector('#translate-ru-check')?.addEventListener('change', (e) => {
        settings.checkEnabled = e.target.checked;
        saveSettingsDebounced();
    });

    document.querySelector('#translate-ru-prompt')?.addEventListener('input', (e) => {
        settings.customPrompt = e.target.value;
        saveSettingsDebounced();
    });
}

// ===================== КНОПКА =====================
function addTranslateButton(messageElement, messageId) {
    if (messageElement.querySelector('.translate-btn')) return;
    if (messageElement.classList.contains('user_mes')) return;

    const extraButtonsBlock = messageElement.querySelector('.extraMesButtons');
    if (!extraButtonsBlock) return;

    const btn = document.createElement('button');
    btn.classList.add('translate-btn', 'mes_button');
    btn.title = 'Перевести';
    btn.innerHTML = '🌐';

    btn.addEventListener('click', async () => {
        const context = getContext();
        const message = context.chat[messageId];
        if (!message) return;

        if (!hasTextToTranslate(message.mes)) {
            btn.innerHTML = '✓';
            setTimeout(() => { btn.innerHTML = '🌐'; }, 1500);
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '⏳';

        try {
            const translated = await translateAndConfirm(message);

            if (translated) {
                if (!message.swipes) {
                    message.swipes = [message.mes];
                    message.swipe_id = 0;
                }
                message.swipes.push(translated);
                message.swipe_id = message.swipes.length - 1;
                message.mes = translated;
                context.saveChat();
                context.updateMessageBlock(messageId, message);
            }

        } catch (error) {
            console.error(`[${EXTENSION_NAME}] Ошибка:`, error);
            btn.innerHTML = '❌';
            setTimeout(() => { btn.innerHTML = '🌐'; btn.disabled = false; }, 2000);
            return;
        }

        btn.innerHTML = '🌐';
        btn.disabled = false;
    });

    extraButtonsBlock.appendChild(btn);
}

function processExistingMessages() {
    document.querySelectorAll('.mes').forEach((mes) => {
        const messageId = parseInt(mes.getAttribute('mesid'));
        if (!isNaN(messageId)) addTranslateButton(mes, messageId);
    });
}

// ===================== ИНИЦИАЛИЗАЦИЯ =====================
jQuery(async () => {
    getSettings();

    const settingsHtml = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <span>Translate to Language</span>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" id="translate-ru-settings"></div>
        </div>`;

    $('#extensions_settings').append(settingsHtml);
    renderSettings();

    eventSource.on(event_types.MESSAGE_RECEIVED, () => setTimeout(processExistingMessages, 100));
    eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(processExistingMessages, 300));
    processExistingMessages();
    console.log(`[${EXTENSION_NAME}] Загружено`);
});
