import { eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { generateTextGenWithStreaming, getTextGenGenerationData } from '../../../textgen-settings.js';
import { callGenericPopup, POPUP_TYPE } from '../../../popup.js';

const EXTENSION_NAME = 'translate-ru';

const TRANSLATE_PROMPT = `Переведи английские части текста на русский, оставив русские части без изменений. Все слова переводи полностью на русский, никаких гибридных слов. Только один вариант перевода, без альтернатив, комментариев, примечаний и пояснений. Сохраняй форматирование исходного сообщения.`;

function hasSignificantEnglish(text) {
    const clean = text.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, ' ');
    const words = clean.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return false;
    const englishWords = new Set(words.filter(w => /^[a-zA-Z]+$/.test(w)));
    return englishWords.size >= 3 && (englishWords.size / words.length) >= 0.05;
}

async function translateText(text) {
    const prompt = `[SYSTEM_PROMPT]${TRANSLATE_PROMPT}[/SYSTEM_PROMPT]\n[INST]${text}[/INST]`;
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

function buildPreview(original, translated) {
    return `
    <div style="max-height:60vh;overflow-y:auto">
      <table style="width:100%;border-collapse:collapse;font-size:0.9em;table-layout:fixed">
        <tr>
          <td style="padding:0 10px 8px 0;width:50%;color:#ff6b6b">● Оригинал</td>
          <td style="padding:0 0 8px 10px;width:50%;color:#6bff6b">● Перевод</td>
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
    let translated = await translateText(message.mes);
    if (!translated) throw new Error('Empty translation');

    while (true) {
        expandDialog();
        const result = await callGenericPopup(
            buildPreview(message.mes, translated),
            POPUP_TYPE.CONFIRM, '',
            {
                okButton: 'Применить',
                cancelButton: 'Повторить',
                customButtons: [{ text: 'Закрыть', result: 2, classes: [] }]
            }
        );

        if (result === 1) return translated;
        if (result === 2) return null;

        translated = await translateText(message.mes);
        if (!translated) throw new Error('Empty translation');
    }
}

function addTranslateButton(messageElement, messageId) {
    if (messageElement.querySelector('.translate-btn')) return;
    if (messageElement.classList.contains('user_mes')) return;

    const extraButtonsBlock = messageElement.querySelector('.extraMesButtons');
    if (!extraButtonsBlock) return;

    const btn = document.createElement('button');
    btn.classList.add('translate-btn', 'mes_button');
    btn.title = 'Перевести на русский';
    btn.innerHTML = '🌐';

    btn.addEventListener('click', async () => {
        const context = getContext();
        const message = context.chat[messageId];
        if (!message) return;

        if (!hasSignificantEnglish(message.mes)) {
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

jQuery(async () => {
    eventSource.on(event_types.MESSAGE_RECEIVED, () => setTimeout(processExistingMessages, 100));
    eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(processExistingMessages, 300));
    processExistingMessages();
    console.log(`[${EXTENSION_NAME}] Загружено`);
});

